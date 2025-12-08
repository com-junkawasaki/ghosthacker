export default {
    "name": "ListProjects",
    "kind": "HoudiniQuery",
    "hash": "3129f16f9599c6309c13e8e5a2a9343a91d949d12522f7a567f54927c3895a4e",

    "raw": `query ListProjects {
  projects {
    id
    title
    description
    createdAt
    updatedAt
  }
}
`,

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

    "pluginData": {},
    "policy": "CacheOrNetwork",
    "partial": false
};

"HoudiniHash=5b8d4269fd155bc4f92b37fc6f969f3689c5238752ed0f1095a034c352ae7942";