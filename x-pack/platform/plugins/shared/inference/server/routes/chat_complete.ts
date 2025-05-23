/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { schema, Type, TypeOf } from '@kbn/config-schema';
import type {
  CoreSetup,
  IRouter,
  Logger,
  RequestHandlerContext,
  KibanaRequest,
} from '@kbn/core/server';
import {
  MessageRole,
  ToolCall,
  ToolChoiceType,
  InferenceTaskEventType,
  isInferenceError,
} from '@kbn/inference-common';
import { observableIntoEventSourceStream } from '@kbn/sse-utils-server';
import type { ChatCompleteRequestBody } from '../../common/http_apis';
import { createClient as createInferenceClient } from '../inference_client';
import { InferenceServerStart, InferenceStartDependencies } from '../types';

function getRequestAbortedSignal(request: KibanaRequest) {
  const controller = new AbortController();
  request.events.aborted$.subscribe({
    complete: () => {
      controller.abort();
    },
  });
  return controller.signal;
}

const toolCallSchema: Type<ToolCall[]> = schema.arrayOf(
  schema.object({
    toolCallId: schema.string(),
    function: schema.object({
      name: schema.string(),
      arguments: schema.maybe(schema.recordOf(schema.string(), schema.any())),
    }),
  })
);

const chatCompleteBodySchema: Type<ChatCompleteRequestBody> = schema.object({
  connectorId: schema.string(),
  system: schema.maybe(schema.string()),
  maxRetries: schema.maybe(schema.number()),
  retryConfiguration: schema.maybe(
    schema.object({
      retryOn: schema.maybe(schema.oneOf([schema.literal('all'), schema.literal('auto')])),
    })
  ),
  tools: schema.maybe(
    schema.recordOf(
      schema.string(),
      schema.object({
        description: schema.string(),
        schema: schema.maybe(
          schema.object({
            type: schema.literal('object'),
            properties: schema.recordOf(schema.string(), schema.any()),
            required: schema.maybe(schema.arrayOf(schema.string())),
          })
        ),
      })
    )
  ),
  toolChoice: schema.maybe(
    schema.oneOf([
      schema.literal(ToolChoiceType.auto),
      schema.literal(ToolChoiceType.none),
      schema.literal(ToolChoiceType.required),
      schema.object({
        function: schema.string(),
      }),
    ])
  ),
  messages: schema.arrayOf(
    schema.oneOf([
      schema.object({
        role: schema.literal(MessageRole.Assistant),
        content: schema.oneOf([schema.string(), schema.literal(null)]),
        toolCalls: schema.maybe(toolCallSchema),
      }),
      schema.object({
        role: schema.literal(MessageRole.User),
        content: schema.string(),
        name: schema.maybe(schema.string()),
      }),
      schema.object({
        name: schema.string(),
        role: schema.literal(MessageRole.Tool),
        toolCallId: schema.string(),
        response: schema.recordOf(schema.string(), schema.any()),
        data: schema.maybe(schema.recordOf(schema.string(), schema.any())),
      }),
    ])
  ),
  functionCalling: schema.maybe(
    schema.oneOf([schema.literal('native'), schema.literal('simulated'), schema.literal('auto')])
  ),
  temperature: schema.maybe(schema.number()),
  modelName: schema.maybe(schema.string()),
});

export function registerChatCompleteRoute({
  coreSetup,
  router,
  logger,
}: {
  coreSetup: CoreSetup<InferenceStartDependencies, InferenceServerStart>;
  router: IRouter<RequestHandlerContext>;
  logger: Logger;
}) {
  async function callChatComplete<T extends boolean>({
    request,
    stream,
  }: {
    request: KibanaRequest<unknown, unknown, TypeOf<typeof chatCompleteBodySchema>>;
    stream: T;
  }) {
    const actions = await coreSetup
      .getStartServices()
      .then(([coreStart, pluginsStart]) => pluginsStart.actions);

    const abortController = new AbortController();
    request.events.aborted$.subscribe(() => abortController.abort());

    const client = createInferenceClient({ request, actions, logger });

    const {
      connectorId,
      messages,
      system,
      toolChoice,
      tools,
      functionCalling,
      maxRetries,
      modelName,
      retryConfiguration,
      temperature,
    } = request.body;

    return client.chatComplete({
      connectorId,
      messages,
      system,
      toolChoice,
      tools,
      functionCalling,
      stream,
      abortSignal: abortController.signal,
      maxRetries,
      modelName,
      retryConfiguration,
      temperature,
    });
  }

  router.post(
    {
      path: '/internal/inference/chat_complete',
      security: {
        authz: {
          enabled: false,
          reason: 'This route is opted out from authorization',
        },
      },
      validate: {
        body: chatCompleteBodySchema,
      },
    },
    async (context, request, response) => {
      try {
        const chatCompleteResponse = await callChatComplete({ request, stream: false });
        return response.ok({
          body: chatCompleteResponse,
        });
      } catch (e) {
        return response.custom({
          statusCode: isInferenceError(e) ? e.meta?.status ?? 500 : 500,
          bypassErrorFormat: true,
          body: {
            type: InferenceTaskEventType.error,
            code: e.code ?? 'unknown',
            message: e.message,
          },
        });
      }
    }
  );

  router.post(
    {
      path: '/internal/inference/chat_complete/stream',
      security: {
        authz: {
          enabled: false,
          reason: 'This route delegates authorization to the inference client',
        },
      },
      validate: {
        body: chatCompleteBodySchema,
      },
    },
    async (context, request, response) => {
      const chatCompleteEvents$ = await callChatComplete({ request, stream: true });
      return response.ok({
        body: observableIntoEventSourceStream(chatCompleteEvents$, {
          logger,
          signal: getRequestAbortedSignal(request),
        }),
      });
    }
  );
}
