export default {
    "name": "ListScenes",
    "kind": "HoudiniQuery",
    "hash": "6cb56f0169f2c06b335e6724fefd4266e7995de7f759c0771d7896ab3b07aa6f",

    "raw": `query ListScenes($storyboardId: ID!) {
  scenes(storyboardId: $storyboardId) {
    id
    storyboardId
    sceneNumber
    textDescription
    mediaType
    mediaUrl
    startTimeSeconds
    durationSeconds
    transitionType
    createdAt
    updatedAt
  }
}
`,

    "rootType": "Query",
    "stripVariables": [],

    "selection": {
        "fields": {
            "scenes": {
                "type": "Scene",
                "keyRaw": "scenes(storyboardId: $storyboardId)",

                "selection": {
                    "fields": {
                        "id": {
                            "type": "ID",
                            "keyRaw": "id",
                            "visible": true
                        },

                        "storyboardId": {
                            "type": "ID",
                            "keyRaw": "storyboardId",
                            "visible": true
                        },

                        "sceneNumber": {
                            "type": "Int",
                            "keyRaw": "sceneNumber",
                            "visible": true
                        },

                        "textDescription": {
                            "type": "String",
                            "keyRaw": "textDescription",
                            "nullable": true,
                            "visible": true
                        },

                        "mediaType": {
                            "type": "String",
                            "keyRaw": "mediaType",
                            "nullable": true,
                            "visible": true
                        },

                        "mediaUrl": {
                            "type": "String",
                            "keyRaw": "mediaUrl",
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

                        "transitionType": {
                            "type": "String",
                            "keyRaw": "transitionType",
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
            "storyboardId": "ID"
        },

        "types": {},
        "defaults": {},
        "runtimeScalars": {}
    },

    "policy": "CacheOrNetwork",
    "partial": false
};

"HoudiniHash=f09f21efeb14e8d6d15308878db8e2ded012f4a9f97253d1dfe50a9641e2d39f";