export default {
    "name": "DeleteScenario",
    "kind": "HoudiniMutation",
    "hash": "3b8a6a250b35259011248a99ca8c2b44f930ecd7998349e671a4dd13206cdc1d",

    "raw": `mutation DeleteScenario($id: ID!) {
  deleteScenario(id: $id)
}`,

    "rootType": "Mutation",
    "stripVariables": [],

    "selection": {
        "fields": {
            "deleteScenario": {
                "type": "Boolean",
                "keyRaw": "deleteScenario(id: $id)",
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

"HoudiniHash=b83c090ebd5d0a24ab0458de3fcefcabcc0bcff48ab2b6267057154021e01d52";