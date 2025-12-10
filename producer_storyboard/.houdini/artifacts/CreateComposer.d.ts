export type CreateComposer = {
    readonly "input": CreateComposer$input;
    readonly "result": CreateComposer$result;
};

export type CreateComposer$result = {
    readonly createComposer: {
        readonly id: string;
        readonly projectId: string;
        readonly title: string;
        readonly durationSeconds: number | null;
        readonly createdAt: string;
        readonly updatedAt: string;
    };
};

type CreateComposerInput = {
    projectId: string | number;
    title?: string | null | undefined;
};

export type CreateComposer$input = {
    input: CreateComposerInput;
};

export type CreateComposer$optimistic = {
    readonly createComposer?: {
        readonly id?: string;
        readonly projectId?: string;
        readonly title?: string;
        readonly durationSeconds?: number | null;
        readonly createdAt?: string;
        readonly updatedAt?: string;
    };
};

export type CreateComposer$artifact = {
    "name": "CreateComposer";
    "kind": "HoudiniMutation";
    "hash": "726ef731e690cca3d60f0ba13dc486f1e9eaf79bc7a81e6b2d9934bf11fadaa6";
    "raw": `mutation CreateComposer($input: CreateComposerInput!) {
  createComposer(input: $input) {
    id
    projectId
    title
    durationSeconds
    createdAt
    updatedAt
  }
}`;
    "rootType": "Mutation";
    "stripVariables": [];
    "selection": {
        "fields": {
            "createComposer": {
                "type": "Composer";
                "keyRaw": "createComposer(input: $input)";
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
                        "durationSeconds": {
                            "type": "Float";
                            "keyRaw": "durationSeconds";
                            "nullable": true;
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
            "input": "CreateComposerInput";
        };
        "types": {
            "CreateComposerInput": {
                "projectId": "ID";
                "title": "String";
            };
        };
        "defaults": {};
        "runtimeScalars": {};
    };
};