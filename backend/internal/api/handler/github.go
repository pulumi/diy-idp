package handler

import (
	"github.com/labstack/echo/v4"
	"github.com/pulumi-idp/internal/model"
	"net/http"
)

func (h *Handler) HandleGitHubToken(c echo.Context) error {
	var req model.OAuthRequest

	if err := c.Request().ParseForm(); err != nil {
		return echo.NewHTTPError(http.StatusBadRequest, "Invalid request body")
	}

	req.GrantType = c.FormValue("grant_type")
	req.RedirectURI = c.FormValue("redirect_uri")
	req.Code = c.FormValue("code")
	req.CodeVerifier = c.FormValue("code_verifier")
	req.ClientID = c.FormValue("client_id")

	if req.Code == "" {
		return echo.NewHTTPError(http.StatusBadRequest, "Missing required field: code")
	}

	oauthResp, err := h.services.GitHubService.ExchangeCodeForToken(req.Code)
	if err != nil {
		c.Logger().Errorf("GitHub token exchange error: %v", err)
		return echo.NewHTTPError(http.StatusInternalServerError, "Failed to exchange token with GitHub")
	}

	return c.JSON(http.StatusOK, oauthResp)
}
