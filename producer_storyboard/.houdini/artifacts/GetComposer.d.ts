export type GetComposer = {
    readonly "input": GetComposer$input;
    readonly "result": GetComposer$result | undefined;
};

export type GetComposer$result = {
    readonly composer: {
        readonly id: string;
        readonly projectId: string;
        readonly title: string;
        readonly durationSeconds: number | null;
        readonly createdAt: string;
        readonly updatedAt: string;
    } | null;
};

export type GetComposer$input = {
    id: string | number;
};

export type GetComposer$artifact = {
    "name": "GetComposer";
    "kind": "HoudiniQuery";
    "hash": "1278eb615b52a1428f261db544afbead2e8854a5662b568310550b02320b57eb";
    "raw": `query GetComposer($id: ID!) {
  composer(id: $id) {
    id
    projectId
    title
    durationSeconds
    createdAt
    updatedAt
  }
}`;
    "rootType": "Query";
    "stripVariables": [];
    "selection": {
        "fields": {
            "composer": {
                "type": "Composer";
                "keyRaw": "composer(id: $id)";
                "nullable": true;
                "selection": {
                    "fields": {
                        "id": {
                            "type": "ID";
                            "keyRaw": "id";
                            "visible": true;
                        };
                        "projectId": {
                            "type": "ID";
                            "keyRaw": "projectId";
                            "visible": true;
                        };
                        "title": {
                            "type": "String";
                            "keyRaw": "title";
                            "visible": true;
                        };
                        "durationSeconds": {
                            "type": "Float";
                            "keyRaw": "durationSeconds";
                            "nullable": true;
                            "visible": true;
                        };
                        "createdAt": {
                            "type": "String";
                            "keyRaw": "createdAt";
                            "visible": true;
                        };
                        "updatedAt": {
                            "type": "String";
                            "keyRaw": "updatedAt";
                            "visible": true;
                        };
                    };
                };
                "visible": true;
            };
        };
    };
    "pluginData": {
        "houdini-svelte": {};
    };
    "input": {
        "fields": {
            "id": "ID";
        };
        "types": {};
        "defaults": {};
        "runtimeScalars": {};
    };
    "policy": "CacheOrNetwork";
    "partial": false;
};