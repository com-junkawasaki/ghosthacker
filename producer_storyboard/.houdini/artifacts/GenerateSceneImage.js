export default {
    "name": "GenerateSceneImage",
    "kind": "HoudiniMutation",
    "hash": "526831c71502a52a60079d5fa879764fa2f4b4ec1fb7efa420e3646f52e7a65e",

    "raw": `mutation GenerateSceneImage($input: GenerateSceneImageInput!) {
  generateSceneImage(input: $input) {
    id
    sceneId
    openaiImageId
    imageFormat
    prompt
    model
    createdAt
  }
}`,

    "rootType": "Mutation",
    "stripVariables": [],

    "selection": {
        "fields": {
            "generateSceneImage": {
                "type": "GeneratedImage",
                "keyRaw": "generateSceneImage(input: $input)",

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

                        "openaiImageId": {
                            "type": "String",
                            "keyRaw": "openaiImageId",
                            "nullable": true,
                            "visible": true
                        },

                        "imageFormat": {
                            "type": "String",
                            "keyRaw": "imageFormat",
                            "nullable": true,
                            "visible": true
                        },

                        "prompt": {
                            "type": "String",
                            "keyRaw": "prompt",
                            "nullable": true,
                            "visible": true
                        },

                        "model": {
                            "type": "String",
                            "keyRaw": "model",
                            "nullable": true,
                            "visible": true
                        },

                        "createdAt": {
                            "type": "String",
                            "keyRaw": "createdAt",
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
            "input": "GenerateSceneImageInput"
        },

        "types": {
            "GenerateSceneImageInput": {
                "sceneId": "ID",
                "prompt": "String",
                "model": "String"
            }
        },

        "defaults": {},
        "runtimeScalars": {}
    }
};

"HoudiniHash=0361047e61538e97b92ee625ae28c2f86737c458c56d20e4816d44f423cedfcd";