export type ListHumeVoices = {
    readonly "input": ListHumeVoices$input;
    readonly "result": ListHumeVoices$result | undefined;
};

export type ListHumeVoices$result = {
    readonly humeVoices: ({
        readonly id: string;
        readonly name: string;
        readonly description: string | null;
        readonly language: string | null;
    })[];
};

export type ListHumeVoices$input = null;

export type ListHumeVoices$artifact = {
    "name": "ListHumeVoices";
    "kind": "HoudiniQuery";
    "hash": "248c60792bb54c0fe643f7b501a13815a74f5090a35c914a67b0b65d6ad710a1";
    "raw": `query ListHumeVoices {
  humeVoices {
    id
    name
    description
    language
  }
}`;
    "rootType": "Query";
    "stripVariables": [];
    "selection": {
        "fields": {
            "humeVoices": {
                "type": "HumeVoice";
                "keyRaw": "humeVoices";
                "selection": {
                    "fields": {
                        "id": {
                            "type": "String";
                            "keyRaw": "id";
                            "visible": true;
                        };
                        "name": {
                            "type": "String";
                            "keyRaw": "name";
                            "visible": true;
                        };
                        "description": {
                            "type": "String";
                            "keyRaw": "description";
                            "nullable": true;
                            "visible": true;
                        };
                        "language": {
                            "type": "String";
                            "keyRaw": "language";
                            "nullable": true;
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
    "policy": "CacheOrNetwork";
    "partial": false;
};