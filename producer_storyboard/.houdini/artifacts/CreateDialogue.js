export default {
    "name": "CreateDialogue",
    "kind": "HoudiniMutation",
    "hash": "274d7c3b75c2d30562815c174f56e040462f0755e80acca8c2713a28ac698cbf",

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
}`,

    "rootType": "Mutation",
    "stripVariables": [],

    "selection": {
        "fields": {
            "createDialogue": {
                "type": "Dialogue",
                "keyRaw": "createDialogue(input: $input)",

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
            "input": "CreateDialogueInput"
        },

        "types": {
            "CreateDialogueInput": {
                "sceneId": "ID",
                "characterId": "ID",
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

"HoudiniHash=15b66552f387917bb82e8b9a0465bda5f098662add0c659decfd3126e1dfc175";