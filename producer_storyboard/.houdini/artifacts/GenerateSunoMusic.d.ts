export type GenerateSunoMusic = {
    readonly "input": GenerateSunoMusic$input;
    readonly "result": GenerateSunoMusic$result;
};

export type GenerateSunoMusic$result = {
    readonly generateSunoMusic: {
        readonly id: string;
        readonly composerId: string | null;
        readonly prompt: string;
        readonly status: string;
        readonly audioUrl: string | null;
        readonly audioDataId: string | null;
        readonly taskId: string | null;
        readonly createdAt: string;
        readonly updatedAt: string;
    };
};

type GenerateSunoMusicInput = {
    composerId?: string | number | null | undefined;
    prompt: string;
    customMode?: boolean | null | undefined;
    makeInstrumental?: boolean | null | undefined;
    mv?: string | null | undefined;
};

export type GenerateSunoMusic$input = {
    input: GenerateSunoMusicInput;
};

export type GenerateSunoMusic$optimistic = {
    readonly generateSunoMusic?: {
        readonly id?: string;
        readonly composerId?: string | null;
        readonly prompt?: string;
        readonly status?: string;
        readonly audioUrl?: string | null;
        readonly audioDataId?: string | null;
        readonly taskId?: string | null;
        readonly createdAt?: string;
        readonly updatedAt?: string;
    };
};

export type GenerateSunoMusic$artifact = {
    "name": "GenerateSunoMusic";
    "kind": "HoudiniMutation";
    "hash": "663bfcb420841daa7b8a326636afe03c9a1f555388834ddc6550de2146f4fce8";
    "raw": `mutation GenerateSunoMusic($input: GenerateSunoMusicInput!) {
  generateSunoMusic(input: $input) {
    id
    composerId
    prompt
    status
    audioUrl
    audioDataId
    taskId
    createdAt
    updatedAt
  }
}`;
    "rootType": "Mutation";
    "stripVariables": [];
    "selection": {
        "fields": {
            "generateSunoMusic": {
                "type": "SunoMusic";
                "keyRaw": "generateSunoMusic(input: $input)";
                "selection": {
                    "fields": {
                        "id": {
                            "type": "ID";
                            "keyRaw": "id";
                            "visible": true;
                        };
                        "composerId": {
                            "type": "ID";
                            "keyRaw": "composerId";
                            "nullable": true;
                            "visible": true;
                        };
                        "prompt": {
                            "type": "String";
                            "keyRaw": "prompt";
                            "visible": true;
                        };
                        "status": {
                            "type": "String";
                            "keyRaw": "status";
                            "visible": true;
                        };
                        "audioUrl": {
                            "type": "String";
                            "keyRaw": "audioUrl";
                            "nullable": true;
                            "visible": true;
                        };
                        "audioDataId": {
                            "type": "ID";
                            "keyRaw": "audioDataId";
                            "nullable": true;
                            "visible": true;
                        };
                        "taskId": {
                            "type": "String";
                            "keyRaw": "taskId";
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
            "input": "GenerateSunoMusicInput";
        };
        "types": {
            "GenerateSunoMusicInput": {
                "composerId": "ID";
                "prompt": "String";
                "customMode": "Boolean";
                "makeInstrumental": "Boolean";
                "mv": "String";
            };
        };
        "defaults": {};
        "runtimeScalars": {};
    };
};