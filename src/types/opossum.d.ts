declare module 'opossum' {
    namespace CircuitBreaker { // Change to namespace
        interface Options {
            timeout?: number;
            errorThresholdPercentage?: number;
            resetTimeout?: number;
            rollingCountTimeout?: number;
            rollingCountBuckets?: number;
            volumeThreshold?: number;
            name?: string;
            group?: string;
            maxConcurrentRequests?: number;
            fallback?: Function;
            onCircuitOpen?: Function;
            onCircuitClose?: Function;
            onCircuitHalfOpen?: Function;
            onCircuitFallback?: Function;
            onCircuitSuccess?: Function;
            onCircuitFailure?: Function;
            onCircuitReject?: Function;
            onCircuitTimeout?: Function;
            onCircuitRun?: Function;
        }
    }

    class CircuitBreaker { // Keep the class definition
        constructor(action: Function, options?: CircuitBreaker.Options); // Use CircuitBreaker.Options
        fire(...args: any[]): Promise<any>;
        fallback(fallback: Function): CircuitBreaker;
        on(event: string, listener: Function): CircuitBreaker;
        open(): void;
        close(): void;
        halfOpen(): void;
        stats(): any;
        status: {
            isOpen: boolean;
            isClosed: boolean;
            isHalfOpen: boolean;
        };
    }

    export = CircuitBreaker;
}