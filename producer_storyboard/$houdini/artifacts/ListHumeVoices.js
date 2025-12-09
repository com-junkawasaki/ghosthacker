export default {
    "name": "ListHumeVoices",
    "kind": "HoudiniQuery",
    "hash": "248c60792bb54c0fe643f7b501a13815a74f5090a35c914a67b0b65d6ad710a1",

    "raw": `query ListHumeVoices {
  humeVoices {
    id
    name
    description
    language
  }
}`,

    "rootType": "Query",
    "stripVariables": [],

    "selection": {
        "fields": {
            "humeVoices": {
                "type": "HumeVoice",
                "keyRaw": "humeVoices",

                "selection": {
                    "fields": {
                        "id": {
                            "type": "String",
                            "keyRaw": "id",
                            "visible": true
                        },

                        "name": {
                            "type": "String",
                            "keyRaw": "name",
                            "visible": true
                        },

                        "description": {
                            "type": "String",
                            "keyRaw": "description",
                            "nullable": true,
                            "visible": true
                        },

                        "language": {
                            "type": "String",
                            "keyRaw": "language",
                            "nullable": true,
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

"HoudiniHash=d95b65b7b737350aac089d90a7e4d316f6263bf14c73db4f47a2b8de654cf2f8";