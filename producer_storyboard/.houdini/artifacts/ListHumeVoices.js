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

"HoudiniHash=a0c5e1091e74ce96af406dcc22362f0c6ec657c47e183727115420a6b16056e7";