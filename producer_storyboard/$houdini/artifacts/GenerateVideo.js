export default {
    "name": "GenerateVideo",
    "kind": "HoudiniMutation",
    "hash": "258969b154ef9041e3bd2bfed991daf56fbcdef588127de42c90e0193d11e142",

    "raw": `mutation GenerateVideo($storyboardId: ID!) {
  generateVideo(storyboardId: $storyboardId) {
    id
    storyboardId
    variationNumber
    status
    createdAt
  }
}
`,

    "rootType": "Mutation",
    "stripVariables": [],

    "selection": {
        "fields": {
            "generateVideo": {
                "type": "VideoStatus",
                "keyRaw": "generateVideo(storyboardId: $storyboardId)",

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

                        "status": {
                            "type": "String",
                            "keyRaw": "status",
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

    "pluginData": {},

    "input": {
        "fields": {
            "storyboardId": "ID"
        },

        "types": {},
        "defaults": {},
        "runtimeScalars": {}
    }
};

"HoudiniHash=1507638cfddcb75061717dfa6646725ca51482fa73974c87f5d1ea90b68c1ef9";