(function (globalScope) {
  //---------------
  // ENVIRONMENT
  //---------------
  function detectEnvironment(options = {}) {
    const isBrowser =
      typeof window !== "undefined" && typeof document !== "undefined";

    const platform =
      options.platform ||
      (isBrowser
        ? /Linux/i.test(navigator.platform)
          ? "linux"
          : "windows"
        : process.platform === "linux"
          ? "linux"
          : "windows");

    const hostname =
      options.hostname || (isBrowser ? window.location.hostname : "");

    const isGitUrl =
      options.isGitUrl ??
      ["github.io", "congelator.github.io"].some(
        (value) => hostname === value || hostname.endsWith(`.${value}`),
      );

    const isLocalUrl =
      options.isLocalUrl ?? ["127.0.0.1", "localhost"].includes(hostname);

    console.log("options.mediaServerAvailable :", options.mediaServerAvailable);

    const mediaServerAvailable = options.mediaServerAvailable ?? false;

    const isDevPc = isLocalUrl && mediaServerAvailable;

    //TODO console.log("[calculContext][Environment]");
    //console.log("[calculContext][Environment]");
    //console.log("  platform             :", platform);
    //console.log("  hostname             :", hostname);
    //console.log("  isGitUrl             :", isGitUrl);
    //console.log("  isLocalUrl           :", isLocalUrl);
    //console.log("  mediaServerAvailable :", mediaServerAvailable);
    //console.log("  isBrowser            :", isBrowser);
    //console.log("  isDevPc              :", isDevPc);

    return {
      isBrowser,
      platform,
      hostname,
      isGitUrl,
      isLocalUrl,
      mediaServerAvailable,
      isDevPc,
    };
  }

  //---------------
  // PERMISSIONS
  //---------------
  function calculatePermissions(environment) {
    const canUseMediaServer = environment.mediaServerAvailable;

    const result = {
      canScan: canUseMediaServer && environment.isDevPc,
      canPlay: canUseMediaServer,
      canResume: canUseMediaServer,
      canSynchronize: canUseMediaServer,
      canAssociateTmdb: canUseMediaServer && environment.isDevPc,
      canUseGreyButtons: canUseMediaServer && environment.isDevPc,
      canPublishCatalog: canUseMediaServer && environment.isDevPc,
      canRequest: environment.isGitUrl && !environment.isDevPc,
    };

    //TO DO console.log("[calculContext][Permissions]");
    //console.log("[calculContext][Permissions]");
    //console.log("  canPlay          :", result.canPlay);
    //console.log("  canResume        :", result.canResume);
    //console.log("  canSynchronize   :", result.canSynchronize);
    //console.log("  canScan          :", result.canScan);
    //console.log("  canAssociateTmdb :", result.canAssociateTmdb);
    //console.log("  canUseGreyButtons:", result.canUseGreyButtons);
    //console.log("  canPublishCatalog:", result.canPublishCatalog);
    //console.log("  canRequest       :", result.canRequest);

    return result;
  }

  //------------------------
  // CALCUL CONTEXTE GLOBAL
  //------------------------
  function calculateContext(options = {}) {
    // Étape 1 : prise en compte de l'environnement.
    const environment = detectEnvironment(options);

    // Étape 2 : calcul des autorisations.
    const permissions = calculatePermissions(environment);

    const result = {
      environment,
      permissions,
    };

    console.log("[calculContext][Context]", result);

    return result;
  }

  const calculContext = {
    detectEnvironment,
    calculatePermissions,
    calculateContext,
  };

  if (typeof module !== "undefined" && module.exports) {
    module.exports = calculContext;
  }

  globalScope.calculContext = calculContext;
})(typeof globalThis !== "undefined" ? globalThis : this);
