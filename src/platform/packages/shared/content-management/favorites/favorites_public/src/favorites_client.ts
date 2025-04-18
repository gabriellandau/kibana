/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { HttpStart } from '@kbn/core-http-browser';
import type { UsageCollectionStart } from '@kbn/usage-collection-plugin/public';
import type { UserProfileServiceStart } from '@kbn/core-user-profile-browser';
import type {
  AddFavoriteResponse,
  GetFavoritesResponse as GetFavoritesResponseServer,
  RemoveFavoriteResponse,
} from '@kbn/content-management-favorites-server';
import { firstValueFrom } from 'rxjs';

export interface GetFavoritesResponse<Metadata extends object | void = void>
  extends GetFavoritesResponseServer {
  favoriteMetadata: Metadata extends object ? Record<string, Metadata> : never;
}

type AddFavoriteRequest<Metadata extends object | void> = Metadata extends object
  ? { id: string; metadata: Metadata }
  : { id: string };

export interface FavoritesClientPublic<Metadata extends object | void = void> {
  getFavorites(): Promise<GetFavoritesResponse<Metadata>>;
  addFavorite(params: AddFavoriteRequest<Metadata>): Promise<AddFavoriteResponse>;
  removeFavorite(params: { id: string }): Promise<RemoveFavoriteResponse>;

  isAvailable(): Promise<boolean>;
  getFavoriteType(): string;
  reportAddFavoriteClick(): void;
  reportRemoveFavoriteClick(): void;
}

export class FavoritesClient<Metadata extends object | void = void>
  implements FavoritesClientPublic<Metadata>
{
  constructor(
    private readonly appName: string,
    private readonly favoriteObjectType: string,
    private readonly deps: {
      http: HttpStart;
      userProfile: UserProfileServiceStart;
      usageCollection?: UsageCollectionStart;
    }
  ) {}

  public async isAvailable(): Promise<boolean> {
    return firstValueFrom(this.deps.userProfile.getEnabled$());
  }

  private async ifAvailablePreCheck() {
    if (!(await this.isAvailable()))
      throw new Error('Favorites service is not available for current user');
  }

  public async getFavorites(): Promise<GetFavoritesResponse<Metadata>> {
    await this.ifAvailablePreCheck();
    return this.deps.http.get(`/internal/content_management/favorites/${this.favoriteObjectType}`);
  }

  public async addFavorite(params: AddFavoriteRequest<Metadata>): Promise<AddFavoriteResponse> {
    await this.ifAvailablePreCheck();
    return this.deps.http.post(
      `/internal/content_management/favorites/${this.favoriteObjectType}/${params.id}/favorite`,
      { body: 'metadata' in params ? JSON.stringify({ metadata: params.metadata }) : undefined }
    );
  }

  public async removeFavorite({ id }: { id: string }): Promise<RemoveFavoriteResponse> {
    await this.ifAvailablePreCheck();
    return this.deps.http.post(
      `/internal/content_management/favorites/${this.favoriteObjectType}/${id}/unfavorite`
    );
  }

  public getFavoriteType() {
    return this.favoriteObjectType;
  }

  public reportAddFavoriteClick() {
    this.deps.usageCollection?.reportUiCounter(this.appName, 'click', 'add_favorite');
  }
  public reportRemoveFavoriteClick() {
    this.deps.usageCollection?.reportUiCounter(this.appName, 'click', 'remove_favorite');
  }
}
