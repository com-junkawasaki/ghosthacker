export default {
    "name": "DeleteScene",
    "kind": "HoudiniMutation",
    "hash": "7421a2eec5fbf6e2d29ca918aa010c47febdac17d9648ca0cfb2ac66351b33d6",

    "raw": `mutation DeleteScene($id: ID!) {
  deleteScene(id: $id)
}`,

    "rootType": "Mutation",
    "stripVariables": [],

    "selection": {
        "fields": {
            "deleteScene": {
                "type": "Boolean",
                "keyRaw": "deleteScene(id: $id)",
                "visible": true
            }
        }
    },

    "pluginData": {
        "houdini-svelte": {}
    },

    "input": {
        "fields": {
            "id": "ID"
        },

        "types": {},
        "defaults": {},
        "runtimeScalars": {}
    }
};

"HoudiniHash=82929cc11ff6189ada0e039b29cfa5b328168a8ce15cf2c9d4bac242d1a533f1";