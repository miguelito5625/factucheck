package handlers

import (
	"net/http"

	"factucheck/internal/models"
	"factucheck/internal/services"

	"github.com/gin-gonic/gin"
)

func GetProviders(c *gin.Context) {
	providers, err := services.GetProviders()
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, providers)
}

func CreateProvider(c *gin.Context) {
	var req struct {
		Name  string        `json:"name"`
		Rules []models.Rule `json:"rules"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	provider, err := services.CreateProvider(req.Name, req.Rules)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusCreated, provider)
}

func DeleteProvider(c *gin.Context) {
	id := c.Param("id")
	success, err := services.DeleteProvider(id)
	if err != nil || !success {
		c.JSON(http.StatusNotFound, gin.H{"error": "Provider not found"})
		return
	}
	c.JSON(http.StatusOK, gin.H{"success": true})
}

func UpdateProvider(c *gin.Context) {
	id := c.Param("id")
	var req struct {
		Name  *string       `json:"name"`
		Rules []models.Rule `json:"rules"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	provider, err := services.UpdateProvider(id, req.Name, req.Rules)
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Provider not found"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"success": true, "provider": provider})
}
