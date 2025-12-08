export type UpdateScene = {
    readonly "input": UpdateScene$input;
    readonly "result": UpdateScene$result;
};

export type UpdateScene$result = {
    readonly updateScene: {
        readonly id: string;
        readonly storyboardId: string;
        readonly sceneNumber: number;
        readonly textDescription: string | null;
        readonly startTimeSeconds: number | null;
        readonly durationSeconds: number | null;
        readonly transitionType: string | null;
        readonly createdAt: string;
        readonly updatedAt: string;
    };
};

type UpdateSceneInput = {
    id: string | number;
    textDescription?: string | null | undefined;
    durationSeconds?: number | null | undefined;
    startTimeSeconds?: number | null | undefined;
    transitionType?: string | null | undefined;
};

export type UpdateScene$input = {
    input: UpdateSceneInput;
};

export type UpdateScene$optimistic = {
    readonly updateScene?: {
        readonly id?: string;
        readonly storyboardId?: string;
        readonly sceneNumber?: number;
        readonly textDescription?: string | null;
        readonly startTimeSeconds?: number | null;
        readonly durationSeconds?: number | null;
        readonly transitionType?: string | null;
        readonly createdAt?: string;
        readonly updatedAt?: string;
    };
};

export type UpdateScene$artifact = {
    "name": "UpdateScene";
    "kind": "HoudiniMutation";
    "hash": "08dca1ce9561ef58ed45a3aa33fadb0bf6a99144d5e50b449af9c1330dd21431";
    "raw": `mutation UpdateScene($input: UpdateSceneInput!) {
  updateScene(input: $input) {
    id
    storyboardId
    sceneNumber
    textDescription
    startTimeSeconds
    durationSeconds
    transitionType
    createdAt
    updatedAt
  }
}`;
    "rootType": "Mutation";
    "stripVariables": [];
    "selection": {
        "fields": {
            "updateScene": {
                "type": "Scene";
                "keyRaw": "updateScene(input: $input)";
                "selection": {
                    "fields": {
                        "id": {
                            "type": "ID";
                            "keyRaw": "id";
                            "visible": true;
                        };
                        "storyboardId": {
                            "type": "ID";
                            "keyRaw": "storyboardId";
                            "visible": true;
                        };
                        "sceneNumber": {
                            "type": "Int";
                            "keyRaw": "sceneNumber";
                            "visible": true;
                        };
                        "textDescription": {
                            "type": "String";
                            "keyRaw": "textDescription";
                            "nullable": true;
                            "visible": true;
                        };
                        "startTimeSeconds": {
                            "type": "Float";
                            "keyRaw": "startTimeSeconds";
                            "nullable": true;
                            "visible": true;
                        };
                        "durationSeconds": {
                            "type": "Float";
                            "keyRaw": "durationSeconds";
                            "nullable": true;
                            "visible": true;
                        };
                        "transitionType": {
                            "type": "String";
                            "keyRaw": "transitionType";
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
            "input": "UpdateSceneInput";
        };
        "types": {
            "UpdateSceneInput": {
                "id": "ID";
                "textDescription": "String";
                "durationSeconds": "Float";
                "startTimeSeconds": "Float";
                "transitionType": "String";
            };
        };
        "defaults": {};
        "runtimeScalars": {};
    };
};