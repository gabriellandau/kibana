<!-- Do not edit this file. It is automatically generated by API Documenter. -->

[Home](./index.md) &gt; [kibana-plugin-plugins-expressions-public](./kibana-plugin-plugins-expressions-public.md) &gt; [TypeToString](./kibana-plugin-plugins-expressions-public.typetostring.md)

## TypeToString type

This can convert a type into a known Expression string representation of that type. For example, `TypeToString<Datatable>` will resolve to `'datatable'`<!-- -->. This allows Expression Functions to continue to specify their type in a simple string format.

<b>Signature:</b>

```typescript
export declare type TypeToString<T> = KnownTypeToString<T> | UnmappedTypeStrings;
```
