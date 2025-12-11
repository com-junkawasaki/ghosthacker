export default {
    "name": "ReorderScenePlans",
    "kind": "HoudiniMutation",
    "hash": "012efff6bd3f29b2711c4230543ca0c045f38ad22afa1e578ae038fc918c44fc",

    "raw": `mutation ReorderScenePlans($input: ReorderScenePlansInput!) {
  reorderScenePlans(input: $input) {
    id
    partId
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
            "reorderScenePlans": {
                "type": "ScenePlan",
                "keyRaw": "reorderScenePlans(input: $input)",

                "selection": {
                    "fields": {
                        "id": {
                            "type": "ID",
                            "keyRaw": "id",
                            "visible": true
                        },

                        "partId": {
                            "type": "ID",
                            "keyRaw": "partId",
                            "visible": true
                        },

                        "description": {
                            "type": "String",
                            "keyRaw": "description",
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
            "input": "ReorderScenePlansInput"
        },

        "types": {
            "ReorderScenePlansInput": {
                "partId": "ID",
                "scenePlanIds": "ID"
            }
        },

        "defaults": {},
        "runtimeScalars": {}
    }
};

"HoudiniHash=2c86659f0f5c5f26dde44edefbe98dc4962ca0501a9e00c1e86ce2e8ed85ebf9";