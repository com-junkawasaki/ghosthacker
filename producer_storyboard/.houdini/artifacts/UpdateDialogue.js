export default {
    "name": "UpdateDialogue",
    "kind": "HoudiniMutation",
    "hash": "a383244d43ab5f2b3aa8d88d042e7eeca71ff5b4ec40a099e345df58b5a05be7",

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
}`,

    "rootType": "Mutation",
    "stripVariables": [],

    "selection": {
        "fields": {
            "updateDialogue": {
                "type": "Dialogue",
                "keyRaw": "updateDialogue(input: $input)",

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
            "input": "UpdateDialogueInput"
        },

        "types": {
            "UpdateDialogueInput": {
                "id": "ID",
                "language": "String",
                "text": "String",
                "humeVoiceId": "String",
                "startTimeSeconds": "Float",
                "durationSeconds": "Float",
                "orderIndex": "Int"
            }
        },

        "defaults": {},
        "runtimeScalars": {}
    }
};

"HoudiniHash=0db4803768ca41c461e32fefd4f1d4c28c9ba9271cd124aa30a8eea0ba5a4ed8";