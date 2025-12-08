export default {
    "name": "CreateScene",
    "kind": "HoudiniMutation",
    "hash": "3bc62b43b6304d17fbaec797893a59cbf931d701173e6144d1f36d1e9f10c9a3",

    "raw": `mutation CreateScene($input: CreateSceneInput!) {
  createScene(input: $input) {
    id
    storyboardId
    sceneNumber
    textDescription
    startTimeSeconds
    durationSeconds
    transitionType
    createdAt
    updatedAt
  }
}`,

    "rootType": "Mutation",
    "stripVariables": [],

    "selection": {
        "fields": {
            "createScene": {
                "type": "Scene",
                "keyRaw": "createScene(input: $input)",

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
            "input": "CreateSceneInput"
        },

        "types": {
            "CreateSceneInput": {
                "storyboardId": "ID",
                "sceneNumber": "Int",
                "textDescription": "String",
                "durationSeconds": "Float",
                "startTimeSeconds": "Float",
                "transitionType": "String"
            }
        },

        "defaults": {},
        "runtimeScalars": {}
    }
};

"HoudiniHash=c37b04a06a153353c78656bd7bc4975d5812e6f74e9258e9c4c4ebc1b2ba2c66";