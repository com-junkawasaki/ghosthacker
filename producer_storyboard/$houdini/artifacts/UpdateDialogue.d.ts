export type UpdateDialogue = {
    readonly "input": UpdateDialogue$input;
    readonly "result": UpdateDialogue$result;
};

export type UpdateDialogue$result = {
    readonly updateDialogue: {
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

type UpdateDialogueInput = {
    id: string | number;
    language?: string | null | undefined;
    text?: string | null | undefined;
    humeVoiceId?: string | null | undefined;
    startTimeSeconds?: number | null | undefined;
    durationSeconds?: number | null | undefined;
    orderIndex?: number | null | undefined;
};

export type UpdateDialogue$input = {
    input: UpdateDialogueInput;
};

export type UpdateDialogue$optimistic = {
    readonly updateDialogue?: {
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

export type UpdateDialogue$artifact = {
    "name": "UpdateDialogue";
    "kind": "HoudiniMutation";
    "hash": "a383244d43ab5f2b3aa8d88d042e7eeca71ff5b4ec40a099e345df58b5a05be7";
    "raw": `mutation UpdateDialogue($input: UpdateDialogueInput!) {
  updateDialogue(input: $input) {
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
            "updateDialogue": {
                "type": "Dialogue";
                "keyRaw": "updateDialogue(input: $input)";
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
            "input": "UpdateDialogueInput";
        };
        "types": {
            "UpdateDialogueInput": {
                "id": "ID";
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