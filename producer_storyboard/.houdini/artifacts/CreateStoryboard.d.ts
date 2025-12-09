export type CreateStoryboard = {
    readonly "input": CreateStoryboard$input;
    readonly "result": CreateStoryboard$result;
};

export type CreateStoryboard$result = {
    readonly createStoryboard: {
        readonly id: string;
        readonly projectId: string;
        readonly title: string;
        readonly aspectRatio: string;
        readonly resolution: string;
        readonly durationSeconds: number | null;
        readonly numVariations: number;
        readonly createdAt: string;
        readonly updatedAt: string;
    };
};

type CreateStoryboardInput = {
    projectId: string | number;
    title?: string | null | undefined;
    aspectRatio?: string | null | undefined;
    resolution?: string | null | undefined;
};

export type CreateStoryboard$input = {
    input: CreateStoryboardInput;
};

export type CreateStoryboard$optimistic = {
    readonly createStoryboard?: {
        readonly id?: string;
        readonly projectId?: string;
        readonly title?: string;
        readonly aspectRatio?: string;
        readonly resolution?: string;
        readonly durationSeconds?: number | null;
        readonly numVariations?: number;
        readonly createdAt?: string;
        readonly updatedAt?: string;
    };
};

export type CreateStoryboard$artifact = {
    "name": "CreateStoryboard";
    "kind": "HoudiniMutation";
    "hash": "9584cae1b982cb1b67d03f63ed36957cfc873bce08a514563bf5ba485b1e67d8";
    "raw": `mutation CreateStoryboard($input: CreateStoryboardInput!) {
  createStoryboard(input: $input) {
    id
    projectId
    title
    aspectRatio
    resolution
    durationSeconds
    numVariations
    createdAt
    updatedAt
  }
}`;
    "rootType": "Mutation";
    "stripVariables": [];
    "selection": {
        "fields": {
            "createStoryboard": {
                "type": "Storyboard";
                "keyRaw": "createStoryboard(input: $input)";
                "selection": {
                    "fields": {
                        "id": {
                            "type": "ID";
                            "keyRaw": "id";
                            "visible": true;
                        };
                        "projectId": {
                            "type": "ID";
                            "keyRaw": "projectId";
                            "visible": true;
                        };
                        "title": {
                            "type": "String";
                            "keyRaw": "title";
                            "visible": true;
                        };
                        "aspectRatio": {
                            "type": "String";
                            "keyRaw": "aspectRatio";
                            "visible": true;
                        };
                        "resolution": {
                            "type": "String";
                            "keyRaw": "resolution";
                            "visible": true;
                        };
                        "durationSeconds": {
                            "type": "Int";
                            "keyRaw": "durationSeconds";
                            "nullable": true;
                            "visible": true;
                        };
                        "numVariations": {
                            "type": "Int";
                            "keyRaw": "numVariations";
                            "visible": true;
                        };
                        "createdAt": {
                            "type": "String";
                            "keyRaw": "createdAt";
                            "visible": true;
                        };
                        "updatedAt": {
                            "type": "String";
                            "keyRaw": "updatedAt";
                            "visible": true;
                        };
                    };
                };
                "visible": true;
            };
        };
    };
    "pluginData": {
        "houdini-svelte": {};
    };
    "input": {
        "fields": {
            "input": "CreateStoryboardInput";
        };
        "types": {
            "CreateStoryboardInput": {
                "projectId": "ID";
                "title": "String";
                "aspectRatio": "String";
                "resolution": "String";
            };
        };
        "defaults": {};
        "runtimeScalars": {};
    };
};