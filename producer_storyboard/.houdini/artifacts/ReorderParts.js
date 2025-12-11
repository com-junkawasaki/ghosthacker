export default {
    "name": "ReorderParts",
    "kind": "HoudiniMutation",
    "hash": "9440211c23a594114166ec262d1781c71e93936c0dee7d508f7b9c212da57b7b",

    "raw": `mutation ReorderParts($input: ReorderPartsInput!) {
  reorderParts(input: $input) {
    id
    episodeId
    title
    description
    orderIndex
    createdAt
    updatedAt
  }
}`,

    "rootType": "Mutation",
    "stripVariables": [],

    "selection": {
        "fields": {
            "reorderParts": {
                "type": "Part",
                "keyRaw": "reorderParts(input: $input)",

                "selection": {
                    "fields": {
                        "id": {
                            "type": "ID",
                            "keyRaw": "id",
                            "visible": true
                        },

                        "episodeId": {
                            "type": "ID",
                            "keyRaw": "episodeId",
                            "visible": true
                        },

                        "title": {
                            "type": "String",
                            "keyRaw": "title",
                            "visible": true
                        },

                        "description": {
                            "type": "String",
                            "keyRaw": "description",
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
            "input": "ReorderPartsInput"
        },

        "types": {
            "ReorderPartsInput": {
                "episodeId": "ID",
                "partIds": "ID"
            }
        },

        "defaults": {},
        "runtimeScalars": {}
    }
};

"HoudiniHash=c0cda1c61703906e62c6149d23b4dc44615b9ad5ddeccfc381ead0efce898f35";