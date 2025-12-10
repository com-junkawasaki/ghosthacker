export default {
    "name": "ListComposers",
    "kind": "HoudiniQuery",
    "hash": "b2d928ba90241b2bc24cdaabe9b4f5ca5dcd22bf463e9a06dd35862a3de7c04e",

    "raw": `query ListComposers($projectId: ID!) {
  composers(projectId: $projectId) {
    id
    projectId
    title
    durationSeconds
    createdAt
    updatedAt
  }
}`,

    "rootType": "Query",
    "stripVariables": [],

    "selection": {
        "fields": {
            "composers": {
                "type": "Composer",
                "keyRaw": "composers(projectId: $projectId)",

                "selection": {
                    "fields": {
                        "id": {
                            "type": "ID",
                            "keyRaw": "id",
                            "visible": true
                        },

                        "projectId": {
                            "type": "ID",
                            "keyRaw": "projectId",
                            "visible": true
                        },

                        "title": {
                            "type": "String",
                            "keyRaw": "title",
                            "visible": true
                        },

                        "durationSeconds": {
                            "type": "Float",
                            "keyRaw": "durationSeconds",
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
            "projectId": "ID"
        },

        "types": {},
        "defaults": {},
        "runtimeScalars": {}
    },

    "policy": "CacheOrNetwork",
    "partial": false
};

"HoudiniHash=5022849cd5deb624dac9401b7b101ee15363cd311ea2438f91eab223582bf908";