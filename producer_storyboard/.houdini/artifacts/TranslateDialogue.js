export default {
    "name": "TranslateDialogue",
    "kind": "HoudiniMutation",
    "hash": "84be3f0e63056dff4018e9d7804446bd5cd50d834149606d628cd2083b4b38a4",

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
}`,

    "rootType": "Mutation",
    "stripVariables": [],

    "selection": {
        "fields": {
            "translateDialogue": {
                "type": "Dialogue",
                "keyRaw": "translateDialogue(input: $input)",

                "selection": {
                    "fields": {
                        "id": {
                            "type": "ID",
                            "keyRaw": "id",
                            "visible": true
                        },

                        "sceneId": {
                            "type": "ID",
                            "keyRaw": "sceneId",
                            "visible": true
                        },

                        "characterId": {
                            "type": "ID",
                            "keyRaw": "characterId",
                            "visible": true
                        },

                        "language": {
                            "type": "String",
                            "keyRaw": "language",
                            "visible": true
                        },

                        "text": {
                            "type": "String",
                            "keyRaw": "text",
                            "visible": true
                        },

                        "translatedText": {
                            "type": "String",
                            "keyRaw": "translatedText",
                            "nullable": true,
                            "visible": true
                        },

                        "humeVoiceId": {
                            "type": "String",
                            "keyRaw": "humeVoiceId",
                            "nullable": true,
                            "visible": true
                        },

                        "audioUrl": {
                            "type": "String",
                            "keyRaw": "audioUrl",
                            "nullable": true,
                            "visible": true
                        },

                        "startTimeSeconds": {
                            "type": "Float",
                            "keyRaw": "startTimeSeconds",
                            "nullable": true,
                            "visible": true
                        },

                        "durationSeconds": {
                            "type": "Float",
                            "keyRaw": "durationSeconds",
                            "nullable": true,
                            "visible": true
                        },

                        "orderIndex": {
                            "type": "Int",
                            "keyRaw": "orderIndex",
                            "visible": true
                        },

                        "createdAt": {
                            "type": "String",
                            "keyRaw": "createdAt",
                            "visible": true
                        },

                        "updatedAt": {
                            "type": "String",
                            "keyRaw": "updatedAt",
                            "visible": true
                        }
                    }
                },

                "visible": true
            }
        }
    },

    "pluginData": {
        "houdini-svelte": {}
    },

    "input": {
        "fields": {
            "input": "TranslateDialogueInput"
        },

        "types": {
            "TranslateDialogueInput": {
                "dialogueId": "ID",
                "targetLanguage": "String"
            }
        },

        "defaults": {},
        "runtimeScalars": {}
    }
};

"HoudiniHash=2e7057d377febf3611687c9466d0b09d86e5773b7e70202a205faf95f23b1a88";