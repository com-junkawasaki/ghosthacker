/**
 * Custom middleware for extracting request headers and adding them to GraphQL context
 */
use poem::{
    Endpoint, Middleware, Request, Result,
};
use async_trait::async_trait;

/// Middleware to extract headers and add them to GraphQL context
pub struct HeaderExtractorMiddleware;

impl<E: Endpoint> Middleware<E> for HeaderExtractorMiddleware {
    type Output = HeaderExtractorEndpoint<E>;

    fn transform(&self, ep: E) -> Self::Output {
        HeaderExtractorEndpoint { ep }
    }
}

pub struct HeaderExtractorEndpoint<E> {
    ep: E,
}

#[async_trait]
impl<E: Endpoint> Endpoint for HeaderExtractorEndpoint<E> {
    type Output = E::Output;

    async fn call(&self, mut req: Request) -> Result<Self::Output> {
        // Extract headers and add to request extensions
        // This makes headers available in async-graphql context via ctx.data::<HeaderMap>()
        let headers = req.headers().clone();
        req.extensions_mut().insert(headers);
        self.ep.call(req).await
    }
}
