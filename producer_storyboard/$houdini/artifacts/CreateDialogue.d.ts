export type CreateDialogue = {
    readonly "input": CreateDialogue$input;
    readonly "result": CreateDialogue$result;
};

export type CreateDialogue$result = {
    readonly createDialogue: {
        readonly id: string;
        readonly sceneId: string;
        readonly characterId: string;
        readonly language: string;
        readonly text: string;
        readonly translatedText: string | null;
        readonly humeVoiceId: string | null;
        readonly audioUrl: string | null;
        readonly startTimeSeconds: number | null;
        readonly durationSeconds: number | null;
        readonly orderIndex: number;
        readonly createdAt: string;
        readonly updatedAt: string;
    };
};

type CreateDialogueInput = {
    sceneId: string | number;
    characterId: string | number;
    language: string;
    text: string;
    humeVoiceId?: string | null | undefined;
    startTimeSeconds?: number | null | undefined;
    durationSeconds?: number | null | undefined;
    orderIndex?: number | null | undefined;
};

export type CreateDialogue$input = {
    input: CreateDialogueInput;
};

export type CreateDialogue$optimistic = {
    readonly createDialogue?: {
        readonly id?: string;
        readonly sceneId?: string;
        readonly characterId?: string;
        readonly language?: string;
        readonly text?: string;
        readonly translatedText?: string | null;
        readonly humeVoiceId?: string | null;
        readonly audioUrl?: string | null;
        readonly startTimeSeconds?: number | null;
        readonly durationSeconds?: number | null;
        readonly orderIndex?: number;
        readonly createdAt?: string;
        readonly updatedAt?: string;
    };
};

export type CreateDialogue$artifact = {
    "name": "CreateDialogue";
    "kind": "HoudiniMutation";
    "hash": "274d7c3b75c2d30562815c174f56e040462f0755e80acca8c2713a28ac698cbf";
    "raw": `mutation CreateDialogue($input: CreateDialogueInput!) {
  createDialogue(input: $input) {
    id
    sceneId
    characterId
    language
    text
    translatedText
    humeVoiceId
    audioUrl
    startTimeSeconds
    durationSeconds
    orderIndex
    createdAt
    updatedAt
  }
}`;
    "rootType": "Mutation";
    "stripVariables": [];
    "selection": {
        "fields": {
            "createDialogue": {
                "type": "Dialogue";
                "keyRaw": "createDialogue(input: $input)";
                "selection": {
                    "fields": {
                        "id": {
                            "type": "ID";
                            "keyRaw": "id";
                            "visible": true;
                        };
                        "sceneId": {
                            "type": "ID";
                            "keyRaw": "sceneId";
                            "visible": true;
                        };
                        "characterId": {
                            "type": "ID";
                            "keyRaw": "characterId";
                            "visible": true;
                        };
                        "language": {
                            "type": "String";
                            "keyRaw": "language";
                            "visible": true;
                        };
                        "text": {
                            "type": "String";
                            "keyRaw": "text";
                            "visible": true;
                        };
                        "translatedText": {
                            "type": "String";
                            "keyRaw": "translatedText";
                            "nullable": true;
                            "visible": true;
                        };
                        "humeVoiceId": {
                            "type": "String";
                            "keyRaw": "humeVoiceId";
                            "nullable": true;
                            "visible": true;
                        };
                        "audioUrl": {
                            "type": "String";
                            "keyRaw": "audioUrl";
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
                        "orderIndex": {
                            "type": "Int";
                            "keyRaw": "orderIndex";
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
            "input": "CreateDialogueInput";
        };
        "types": {
            "CreateDialogueInput": {
                "sceneId": "ID";
                "characterId": "ID";
                "language": "String";
                "text": "String";
                "humeVoiceId": "String";
                "startTimeSeconds": "Float";
                "durationSeconds": "Float";
                "orderIndex": "Int";
            };
        };
        "defaults": {};
        "runtimeScalars": {};
    };
};