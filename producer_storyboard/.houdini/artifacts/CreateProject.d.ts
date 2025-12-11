export type CreateProject = {
    readonly "input": CreateProject$input;
    readonly "result": CreateProject$result;
};

export type CreateProject$result = {
    readonly createProject: {
        readonly id: string;
        readonly title: string;
        readonly description: string | null;
        readonly createdAt: string;
        readonly updatedAt: string;
    };
};

type CreateProjectInput = {
    orgId: string | number;
    title: string;
    description?: string | null | undefined;
};

export type CreateProject$input = {
    input: CreateProjectInput;
};

export type CreateProject$optimistic = {
    readonly createProject?: {
        readonly id?: string;
        readonly title?: string;
        readonly description?: string | null;
        readonly createdAt?: string;
        readonly updatedAt?: string;
    };
};

export type CreateProject$artifact = {
    "name": "CreateProject";
    "kind": "HoudiniMutation";
    "hash": "875bfc962ac7788ab83986bcc34377628d9bb50d8fddc5f86b3ef6b49f286c94";
    "raw": `mutation CreateProject($input: CreateProjectInput!) {
  createProject(input: $input) {
    id
    title
    description
    createdAt
    updatedAt
  }
}`;
    "rootType": "Mutation";
    "stripVariables": [];
    "selection": {
        "fields": {
            "createProject": {
                "type": "Project";
                "keyRaw": "createProject(input: $input)";
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
    "input": {
        "fields": {
            "input": "CreateProjectInput";
        };
        "types": {
            "CreateProjectInput": {
                "orgId": "ID";
                "title": "String";
                "description": "String";
            };
        };
        "defaults": {};
        "runtimeScalars": {};
    };
};