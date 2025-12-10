export default {
    "name": "GetGeneratedImages",
    "kind": "HoudiniQuery",
    "hash": "40d83904bdfaf24f16d80b14e49f671320167a050c421bf0f61c52051c7a11b3",

    "raw": `query GetGeneratedImages($sceneId: ID!) {
  generatedImages(sceneId: $sceneId) {
    id
    sceneId
    openaiImageId
    imageFormat
    imageType
    prompt
    model
    createdAt
  }
}`,

    "rootType": "Query",
    "stripVariables": [],

    "selection": {
        "fields": {
            "generatedImages": {
                "type": "GeneratedImage",
                "keyRaw": "generatedImages(sceneId: $sceneId)",

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

                        "imageType": {
                            "type": "String",
                            "keyRaw": "imageType",
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
            "sceneId": "ID"
        },

        "types": {},
        "defaults": {},
        "runtimeScalars": {}
    },

    "policy": "CacheOrNetwork",
    "partial": false
};

"HoudiniHash=ae12f6a768007b4157bb8a56109589f3e3fc29e3f2d8111633fd00890bf218d8";