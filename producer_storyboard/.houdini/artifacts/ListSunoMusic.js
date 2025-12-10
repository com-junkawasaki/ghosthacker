export default {
    "name": "ListSunoMusic",
    "kind": "HoudiniQuery",
    "hash": "2df9ad83e7a02583ff1c3b52bc077fa798e648778f36a1458d4c3501144f953a",

    "raw": `query ListSunoMusic($composerId: ID!) {
  sunoMusic(composerId: $composerId) {
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
}`,

    "rootType": "Query",
    "stripVariables": [],

    "selection": {
        "fields": {
            "sunoMusic": {
                "type": "SunoMusic",
                "keyRaw": "sunoMusic(composerId: $composerId)",

                "selection": {
                    "fields": {
                        "id": {
                            "type": "ID",
                            "keyRaw": "id",
                            "visible": true
                        },

                        "composerId": {
                            "type": "ID",
                            "keyRaw": "composerId",
                            "nullable": true,
                            "visible": true
                        },

                        "prompt": {
                            "type": "String",
                            "keyRaw": "prompt",
                            "visible": true
                        },

                        "status": {
                            "type": "String",
                            "keyRaw": "status",
                            "visible": true
                        },

                        "audioUrl": {
                            "type": "String",
                            "keyRaw": "audioUrl",
                            "nullable": true,
                            "visible": true
                        },

                        "audioDataId": {
                            "type": "ID",
                            "keyRaw": "audioDataId",
                            "nullable": true,
                            "visible": true
                        },

                        "taskId": {
                            "type": "String",
                            "keyRaw": "taskId",
                            "nullable": true,
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
            "composerId": "ID"
        },

        "types": {},
        "defaults": {},
        "runtimeScalars": {}
    },

    "policy": "CacheOrNetwork",
    "partial": false
};

"HoudiniHash=f34537b63edc7ced31642bcaa8f82bc2f123620712fd680f843accee979c3c10";