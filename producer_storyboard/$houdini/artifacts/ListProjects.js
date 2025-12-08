export default {
    "name": "ListProjects",
    "kind": "HoudiniQuery",
    "hash": "b683e586c1f15aec4ffa5beb48bcaf18806767092e3e4f5eeffcfe5d6d11a07c",

    "raw": `query ListProjects {
  projects {
    id
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
                "keyRaw": "projects",

                "selection": {
                    "fields": {
                        "id": {
                            "type": "ID",
                            "keyRaw": "id",
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

    "policy": "CacheOrNetwork",
    "partial": false
};

"HoudiniHash=5b8d4269fd155bc4f92b37fc6f969f3689c5238752ed0f1095a034c352ae7942";