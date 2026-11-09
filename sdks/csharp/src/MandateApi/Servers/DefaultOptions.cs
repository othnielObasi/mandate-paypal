using MandateApi.Core.Models;

namespace MandateApi.Servers;

public class DefaultOptions
{
    public ProductionOptions Production { get; set; } = new();
    public LocalOptions Local { get; set; } = new();

    internal UrlTemplate Resolve(ServerEnvironment environment, string path) =>
        environment.Match(
            () => new UrlTemplate(Production.BaseUrl, path, []),
            () => new UrlTemplate(Local.BaseUrl, path, []));

    public class ProductionOptions
    {
        public string BaseUrl { get; set; } = "https://mandate-e13m.onrender.com";
    }

    public class LocalOptions
    {
        public string BaseUrl { get; set; } = "http://localhost:3000";
    }
}
