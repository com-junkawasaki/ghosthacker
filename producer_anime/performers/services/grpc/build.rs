fn main() -> Result<(), Box<dyn std::error::Error>> {
    tonic_build::configure()
        .build_server(true)
        .build_client(false) // サーバー側なのでクライアントは不要
        .protoc_arg("--experimental_allow_proto3_optional")
        .out_dir("src/generated")
        .compile(
            &[
                "proto/common.proto",
                "proto/producer.proto",
                "proto/graph.proto",
            ],
            &["proto"],
        )?;
    Ok(())
}
