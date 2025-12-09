export type TranslateDialogue = {
    readonly "input": TranslateDialogue$input;
    readonly "result": TranslateDialogue$result;
};

export type TranslateDialogue$result = {
    readonly translateDialogue: {
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

type TranslateDialogueInput = {
    dialogueId: string | number;
    targetLanguage: string;
};

export type TranslateDialogue$input = {
    input: TranslateDialogueInput;
};

export type TranslateDialogue$optimistic = {
    readonly translateDialogue?: {
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

export type TranslateDialogue$artifact = {
    "name": "TranslateDialogue";
    "kind": "HoudiniMutation";
    "hash": "84be3f0e63056dff4018e9d7804446bd5cd50d834149606d628cd2083b4b38a4";
    "raw": `mutation TranslateDialogue($input: TranslateDialogueInput!) {
  translateDialogue(input: $input) {
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
            "translateDialogue": {
                "type": "Dialogue";
                "keyRaw": "translateDialogue(input: $input)";
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
            "input": "TranslateDialogueInput";
        };
        "types": {
            "TranslateDialogueInput": {
                "dialogueId": "ID";
                "targetLanguage": "String";
            };
        };
        "defaults": {};
        "runtimeScalars": {};
    };
};