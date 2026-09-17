/* eslint-disable */
/**
 * Generated `api` utility.
 *
 * THIS CODE IS AUTOMATICALLY GENERATED.
 *
 * To regenerate, run `npx convex dev`.
 * @module
 */

import type * as auth from "../auth.js";
import type * as discord from "../discord.js";
import type * as discordCallback from "../discordCallback.js";
import type * as discordSignup from "../discordSignup.js";
import type * as http from "../http.js";
import type * as lib_auth from "../lib/auth.js";
import type * as lib_buildSiteDiscordAuthorizeUrl from "../lib/buildSiteDiscordAuthorizeUrl.js";
import type * as lib_caseUrlPattern from "../lib/caseUrlPattern.js";
import type * as lib_cloudflareCustomHostnames from "../lib/cloudflareCustomHostnames.js";
import type * as lib_completeSiteDiscordOAuth from "../lib/completeSiteDiscordOAuth.js";
import type * as lib_customDomainValidators from "../lib/customDomainValidators.js";
import type * as lib_customDomainsConfig from "../lib/customDomainsConfig.js";
import type * as lib_discordAppCredentials from "../lib/discordAppCredentials.js";
import type * as lib_discordProfile from "../lib/discordProfile.js";
import type * as lib_discordSiteScopes from "../lib/discordSiteScopes.js";
import type * as lib_mergeUserAccounts from "../lib/mergeUserAccounts.js";
import type * as lib_meridianPlan from "../lib/meridianPlan.js";
import type * as lib_pageAccessCore from "../lib/pageAccessCore.js";
import type * as lib_pageAccessTypes from "../lib/pageAccessTypes.js";
import type * as lib_pageBreadcrumbs from "../lib/pageBreadcrumbs.js";
import type * as lib_protectedPageBlocks from "../lib/protectedPageBlocks.js";
import type * as lib_siteAccessCore from "../lib/siteAccessCore.js";
import type * as lib_siteAccessError from "../lib/siteAccessError.js";
import type * as lib_siteBot from "../lib/siteBot.js";
import type * as lib_siteCustomDomainTypes from "../lib/siteCustomDomainTypes.js";
import type * as lib_siteDiscordCookies from "../lib/siteDiscordCookies.js";
import type * as lib_siteDiscordState from "../lib/siteDiscordState.js";
import type * as lib_siteLimits from "../lib/siteLimits.js";
import type * as lib_siteOwnerClaim from "../lib/siteOwnerClaim.js";
import type * as lib_siteProtectedPage from "../lib/siteProtectedPage.js";
import type * as lib_siteTypes from "../lib/siteTypes.js";
import type * as lib_siteValidators from "../lib/siteValidators.js";
import type * as meridian from "../meridian.js";
import type * as meridian_adapter from "../meridian/adapter.js";
import type * as meridian_mockAdapter from "../meridian/mockAdapter.js";
import type * as meridian_onboarding from "../meridian/onboarding.js";
import type * as meridian_planSync from "../meridian/planSync.js";
import type * as meridian_tokens from "../meridian/tokens.js";
import type * as meridian_types from "../meridian/types.js";
import type * as meridian_userinfo from "../meridian/userinfo.js";
import type * as meridianCallback from "../meridianCallback.js";
import type * as oauth from "../oauth.js";
import type * as pageAccessActions from "../pageAccessActions.js";
import type * as pageAccessInternal from "../pageAccessInternal.js";
import type * as pageAccessQueries from "../pageAccessQueries.js";
import type * as r2Client from "../r2Client.js";
import type * as r2Env from "../r2Env.js";
import type * as siteAccess from "../siteAccess.js";
import type * as siteAccessActions from "../siteAccessActions.js";
import type * as siteBlocks from "../siteBlocks.js";
import type * as siteCases from "../siteCases.js";
import type * as siteCustomDomains from "../siteCustomDomains.js";
import type * as siteCustomDomainsActions from "../siteCustomDomainsActions.js";
import type * as siteCustomDomainsInternal from "../siteCustomDomainsInternal.js";
import type * as siteCustomDomainsInternalQueries from "../siteCustomDomainsInternalQueries.js";
import type * as siteDiscordAuth from "../siteDiscordAuth.js";
import type * as siteDiscordAuthInternal from "../siteDiscordAuthInternal.js";
import type * as siteDiscordAuthMutations from "../siteDiscordAuthMutations.js";
import type * as siteDiscordAuthQueries from "../siteDiscordAuthQueries.js";
import type * as siteMedia from "../siteMedia.js";
import type * as siteMediaActions from "../siteMediaActions.js";
import type * as sitePages from "../sitePages.js";
import type * as sites from "../sites.js";
import type * as userIdentity from "../userIdentity.js";
import type * as userMerge from "../userMerge.js";
import type * as userProfile from "../userProfile.js";
import type * as users from "../users.js";

import type {
  ApiFromModules,
  FilterApi,
  FunctionReference,
} from "convex/server";

declare const fullApi: ApiFromModules<{
  auth: typeof auth;
  discord: typeof discord;
  discordCallback: typeof discordCallback;
  discordSignup: typeof discordSignup;
  http: typeof http;
  "lib/auth": typeof lib_auth;
  "lib/buildSiteDiscordAuthorizeUrl": typeof lib_buildSiteDiscordAuthorizeUrl;
  "lib/caseUrlPattern": typeof lib_caseUrlPattern;
  "lib/cloudflareCustomHostnames": typeof lib_cloudflareCustomHostnames;
  "lib/completeSiteDiscordOAuth": typeof lib_completeSiteDiscordOAuth;
  "lib/customDomainValidators": typeof lib_customDomainValidators;
  "lib/customDomainsConfig": typeof lib_customDomainsConfig;
  "lib/discordAppCredentials": typeof lib_discordAppCredentials;
  "lib/discordProfile": typeof lib_discordProfile;
  "lib/discordSiteScopes": typeof lib_discordSiteScopes;
  "lib/mergeUserAccounts": typeof lib_mergeUserAccounts;
  "lib/meridianPlan": typeof lib_meridianPlan;
  "lib/pageAccessCore": typeof lib_pageAccessCore;
  "lib/pageAccessTypes": typeof lib_pageAccessTypes;
  "lib/pageBreadcrumbs": typeof lib_pageBreadcrumbs;
  "lib/protectedPageBlocks": typeof lib_protectedPageBlocks;
  "lib/siteAccessCore": typeof lib_siteAccessCore;
  "lib/siteAccessError": typeof lib_siteAccessError;
  "lib/siteBot": typeof lib_siteBot;
  "lib/siteCustomDomainTypes": typeof lib_siteCustomDomainTypes;
  "lib/siteDiscordCookies": typeof lib_siteDiscordCookies;
  "lib/siteDiscordState": typeof lib_siteDiscordState;
  "lib/siteLimits": typeof lib_siteLimits;
  "lib/siteOwnerClaim": typeof lib_siteOwnerClaim;
  "lib/siteProtectedPage": typeof lib_siteProtectedPage;
  "lib/siteTypes": typeof lib_siteTypes;
  "lib/siteValidators": typeof lib_siteValidators;
  meridian: typeof meridian;
  "meridian/adapter": typeof meridian_adapter;
  "meridian/mockAdapter": typeof meridian_mockAdapter;
  "meridian/onboarding": typeof meridian_onboarding;
  "meridian/planSync": typeof meridian_planSync;
  "meridian/tokens": typeof meridian_tokens;
  "meridian/types": typeof meridian_types;
  "meridian/userinfo": typeof meridian_userinfo;
  meridianCallback: typeof meridianCallback;
  oauth: typeof oauth;
  pageAccessActions: typeof pageAccessActions;
  pageAccessInternal: typeof pageAccessInternal;
  pageAccessQueries: typeof pageAccessQueries;
  r2Client: typeof r2Client;
  r2Env: typeof r2Env;
  siteAccess: typeof siteAccess;
  siteAccessActions: typeof siteAccessActions;
  siteBlocks: typeof siteBlocks;
  siteCases: typeof siteCases;
  siteCustomDomains: typeof siteCustomDomains;
  siteCustomDomainsActions: typeof siteCustomDomainsActions;
  siteCustomDomainsInternal: typeof siteCustomDomainsInternal;
  siteCustomDomainsInternalQueries: typeof siteCustomDomainsInternalQueries;
  siteDiscordAuth: typeof siteDiscordAuth;
  siteDiscordAuthInternal: typeof siteDiscordAuthInternal;
  siteDiscordAuthMutations: typeof siteDiscordAuthMutations;
  siteDiscordAuthQueries: typeof siteDiscordAuthQueries;
  siteMedia: typeof siteMedia;
  siteMediaActions: typeof siteMediaActions;
  sitePages: typeof sitePages;
  sites: typeof sites;
  userIdentity: typeof userIdentity;
  userMerge: typeof userMerge;
  userProfile: typeof userProfile;
  users: typeof users;
}>;

/**
 * A utility for referencing Convex functions in your app's public API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = api.myModule.myFunction;
 * ```
 */
export declare const api: FilterApi<
  typeof fullApi,
  FunctionReference<any, "public">
>;

/**
 * A utility for referencing Convex functions in your app's internal API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = internal.myModule.myFunction;
 * ```
 */
export declare const internal: FilterApi<
  typeof fullApi,
  FunctionReference<any, "internal">
>;

export declare const components: {};
