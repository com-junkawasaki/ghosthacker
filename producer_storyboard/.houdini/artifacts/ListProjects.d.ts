export type ListProjects = {
    readonly "input": ListProjects$input;
    readonly "result": ListProjects$result | undefined;
};

export type ListProjects$result = {
    readonly projects: ({
        readonly id: string;
        readonly title: string;
        readonly description: string | null;
        readonly createdAt: string;
        readonly updatedAt: string;
    })[];
};

export type ListProjects$input = null;

export type ListProjects$artifact = {
    "name": "ListProjects";
    "kind": "HoudiniQuery";
    "hash": "b683e586c1f15aec4ffa5beb48bcaf18806767092e3e4f5eeffcfe5d6d11a07c";
    "raw": `query ListProjects {
  projects {
    id
    title
    description
    createdAt
    updatedAt
  }
}`;
    "rootType": "Query";
    "stripVariables": [];
    "selection": {
        "fields": {
            "projects": {
                "type": "Project";
                "keyRaw": "projects";
                "selection": {
                    "fields": {
                        "id": {
                            "type": "ID";
                            "keyRaw": "id";
                            "visible": true;
                        };
                        "title": {
                            "type": "String";
                            "keyRaw": "title";
                            "visible": true;
                        };
                        "description": {
                            "type": "String";
                            "keyRaw": "description";
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
    "policy": "CacheOrNetwork";
    "partial": false;
};