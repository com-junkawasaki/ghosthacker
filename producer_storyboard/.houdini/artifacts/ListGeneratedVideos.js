export default {
    "name": "ListGeneratedVideos",
    "kind": "HoudiniQuery",
    "hash": "d238c8b099c21229d1990f30bb53e3cb251f014a93c653acaf1480b123a99b38",

    "raw": `query ListGeneratedVideos($storyboardId: ID!) {
  generatedVideos(storyboardId: $storyboardId) {
    id
    storyboardId
    variationNumber
    videoUrl
    status
    errorMessage
    createdAt
  }
}`,

    "rootType": "Query",
    "stripVariables": [],

    "selection": {
        "fields": {
            "generatedVideos": {
                "type": "VideoStatus",
                "keyRaw": "generatedVideos(storyboardId: $storyboardId)",

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

                        "variationNumber": {
                            "type": "Int",
                            "keyRaw": "variationNumber",
                            "visible": true
                        },

                        "videoUrl": {
                            "type": "String",
                            "keyRaw": "videoUrl",
                            "nullable": true,
                            "visible": true
                        },

                        "status": {
                            "type": "String",
                            "keyRaw": "status",
                            "visible": true
                        },

                        "errorMessage": {
                            "type": "String",
                            "keyRaw": "errorMessage",
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
            "storyboardId": "ID"
        },

        "types": {},
        "defaults": {},
        "runtimeScalars": {}
    },

    "policy": "CacheOrNetwork",
    "partial": false
};

"HoudiniHash=713c8b0d3a5cb541dd0cb566509bb970aea8458bd5f0734d498aba3790295f4a";