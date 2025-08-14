declare module '@open-policy-agent/opa-wasm' {
    class OpaRuntime {
        static new(wasmBytes: Uint8Array): Promise<OpaRuntime>;
        evaluate(input: string, query: string): any[]; // Assuming it returns an array of any
        free(): void;
    }
}