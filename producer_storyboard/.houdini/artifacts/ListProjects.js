export default {
    "name": "ListProjects",
    "kind": "HoudiniQuery",
    "hash": "d25e2ff0acb5c8319a855d17387fb5c3cb7eb162e789a0dd09998072322ba3d2",

    "raw": `query ListProjects($orgId: ID!) {
  projects(orgId: $orgId) {
    id
    orgId
    title
    description
    createdAt
    updatedAt
  }
}`,

    "rootType": "Query",
    "stripVariables": [],

    "selection": {
        "fields": {
            "projects": {
                "type": "Project",
                "keyRaw": "projects(orgId: $orgId)",

                "selection": {
                    "fields": {
                        "id": {
                            "type": "ID",
                            "keyRaw": "id",
                            "visible": true
                        },

                        "orgId": {
                            "type": "ID",
                            "keyRaw": "orgId",
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
            "orgId": "ID"
        },

        "types": {},
        "defaults": {},
        "runtimeScalars": {}
    },

    "policy": "CacheOrNetwork",
    "partial": false
};

"HoudiniHash=0c36588894c46ac46b167c1e320d7f60d1b22fc2c71bb17f66b4564f9922731b";