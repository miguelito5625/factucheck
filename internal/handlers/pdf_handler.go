package handlers

import (
	"io"
	"net/http"

	"factucheck/internal/services"

	"github.com/gin-gonic/gin"
)

func ExtractText(c *gin.Context) {
	file, _, err := c.Request.FormFile("invoice")
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "No file uploaded"})
		return
	}
	defer file.Close()

	fileData, err := io.ReadAll(file)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	text, err := services.ParsePdf(fileData)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{"text": text})
}

func ValidateStrict(c *gin.Context) {
	file, _, err := c.Request.FormFile("invoice")
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "No file uploaded"})
		return
	}
	defer file.Close()

	providerID := c.Request.FormValue("providerId")
	if providerID == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "No provider selected"})
		return
	}

	fileData, err := io.ReadAll(file)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	text, err := services.ParsePdf(fileData)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	result := services.ValidateInvoice(text, providerID)
	c.JSON(http.StatusOK, result)
}

func DetectHeuristics(c *gin.Context) {
	file, _, err := c.Request.FormFile("invoice")
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "No file uploaded"})
		return
	}
	defer file.Close()

	fileData, err := io.ReadAll(file)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	text, err := services.ParsePdf(fileData)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	result := services.AnalyzeHeuristics(text)
	c.JSON(http.StatusOK, gin.H{"text": text, "result": result})
}

func IdentifyProvider(c *gin.Context) {
	file, _, err := c.Request.FormFile("invoice")
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "No file uploaded"})
		return
	}
	defer file.Close()

	fileData, err := io.ReadAll(file)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	text, err := services.ParsePdf(fileData)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	result := services.IdentifyProvider(text)
	c.JSON(http.StatusOK, result)
}
