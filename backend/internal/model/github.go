package model

type RepoCreationRequest struct {
	RepoName               string   `json:"repo_name"`
	Description            string   `json:"description"`
	Private                bool     `json:"private"`
	EnableBranchProtection bool     `json:"enable_branch_protection"`
	ProtectedBranches      []string `json:"protected_branches"`
	RequireReviews         bool     `json:"require_reviews"`
}

type RepoCreationResponse struct {
	RepoURL  string `json:"repo_url"`
	CloneURL string `json:"clone_url"`
	Message  string `json:"message"`
	Success  bool   `json:"success"`
}

type OAuthRequest struct {
	GrantType    string `form:"grant_type" query:"grant_type"`
	RedirectURI  string `form:"redirect_uri" query:"redirect_uri"`
	Code         string `form:"code" query:"code"`
	CodeVerifier string `form:"code_verifier" query:"code_verifier"`
	ClientID     string `form:"client_id" query:"client_id"`
}
type OAuthResponse struct {
	AccessToken string `json:"access_token"`
	TokenType   string `json:"token_type"`
	Scope       string `json:"scope"`
}
