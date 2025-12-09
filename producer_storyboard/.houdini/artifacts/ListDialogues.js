export default {
    "name": "ListDialogues",
    "kind": "HoudiniQuery",
    "hash": "c282b780d12ae605192da91a14f6b5bf58722c8518989c351b4839d66fb29795",

    "raw": `query ListDialogues($sceneId: ID!) {
  dialogues(sceneId: $sceneId) {
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

    "rootType": "Query",
    "stripVariables": [],

    "selection": {
        "fields": {
            "dialogues": {
                "type": "Dialogue",
                "keyRaw": "dialogues(sceneId: $sceneId)",

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
            "sceneId": "ID"
        },

        "types": {},
        "defaults": {},
        "runtimeScalars": {}
    },

    "policy": "CacheOrNetwork",
    "partial": false
};

"HoudiniHash=abffa4343b8ff906fd734f93f9dd44e9d726b995654371c1e74e555cebf27329";