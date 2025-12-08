export type ReorderScenes = {
    readonly "input": ReorderScenes$input;
    readonly "result": ReorderScenes$result;
};

export type ReorderScenes$result = {
    readonly reorderScenes: ({
        readonly id: string;
        readonly storyboardId: string;
        readonly sceneNumber: number;
        readonly textDescription: string | null;
        readonly startTimeSeconds: number | null;
        readonly durationSeconds: number | null;
        readonly transitionType: string | null;
        readonly createdAt: string;
        readonly updatedAt: string;
    })[];
};

type ReorderScenesInput = {
    storyboardId: string | number;
    sceneIds: (string | number)[];
};

export type ReorderScenes$input = {
    input: ReorderScenesInput;
};

export type ReorderScenes$optimistic = {
    readonly reorderScenes?: ({
        readonly id?: string;
        readonly storyboardId?: string;
        readonly sceneNumber?: number;
        readonly textDescription?: string | null;
        readonly startTimeSeconds?: number | null;
        readonly durationSeconds?: number | null;
        readonly transitionType?: string | null;
        readonly createdAt?: string;
        readonly updatedAt?: string;
    })[];
};

export type ReorderScenes$artifact = {
    "name": "ReorderScenes";
    "kind": "HoudiniMutation";
    "hash": "12994559694876962a3784c4cc8090f745ce0b46eea3002ef77491941337e574";
    "raw": `mutation ReorderScenes($input: ReorderScenesInput!) {
  reorderScenes(input: $input) {
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
            "reorderScenes": {
                "type": "Scene";
                "keyRaw": "reorderScenes(input: $input)";
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
            "input": "ReorderScenesInput";
        };
        "types": {
            "ReorderScenesInput": {
                "storyboardId": "ID";
                "sceneIds": "ID";
            };
        };
        "defaults": {};
        "runtimeScalars": {};
    };
};