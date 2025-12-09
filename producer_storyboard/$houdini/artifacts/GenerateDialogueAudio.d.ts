export type GenerateDialogueAudio = {
    readonly "input": GenerateDialogueAudio$input;
    readonly "result": GenerateDialogueAudio$result;
};

export type GenerateDialogueAudio$result = {
    readonly generateDialogueAudio: {
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

export type GenerateDialogueAudio$input = {
    dialogueId: string | number;
};

export type GenerateDialogueAudio$optimistic = {
    readonly generateDialogueAudio?: {
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

export type GenerateDialogueAudio$artifact = {
    "name": "GenerateDialogueAudio";
    "kind": "HoudiniMutation";
    "hash": "46e914a45e8a18c097e61b522cd5e3b04e809abb743eae1150f4e6a448720783";
    "raw": `mutation GenerateDialogueAudio($dialogueId: ID!) {
  generateDialogueAudio(dialogueId: $dialogueId) {
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
            "generateDialogueAudio": {
                "type": "Dialogue";
                "keyRaw": "generateDialogueAudio(dialogueId: $dialogueId)";
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
            "dialogueId": "ID";
        };
        "types": {};
        "defaults": {};
        "runtimeScalars": {};
    };
};