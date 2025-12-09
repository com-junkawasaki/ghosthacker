export default {
    "name": "DeleteCharacter",
    "kind": "HoudiniMutation",
    "hash": "2bf60afe9425b1608482eee2ea5062f0faaedc65f0704dd738dbace8f770bd1d",

    "raw": `mutation DeleteCharacter($id: ID!) {
  deleteCharacter(id: $id)
}`,

    "rootType": "Mutation",
    "stripVariables": [],

    "selection": {
        "fields": {
            "deleteCharacter": {
                "type": "Boolean",
                "keyRaw": "deleteCharacter(id: $id)",
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

"HoudiniHash=d111227822e76f294d001a6200d92c530998f8ecbdb8738345380bb02d32eba9";