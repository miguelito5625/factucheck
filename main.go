package main

import (
	"embed"
	"io/fs"
	"log"
	"net/http"
	"os"
	"path/filepath"
	"strings"

	"factucheck/internal/handlers"
	"factucheck/internal/services"

	"github.com/gin-gonic/gin"
)

//go:embed public
var publicFS embed.FS

func main() {
	// Initialize the provider service with the executable's directory
	exePath, err := os.Executable()
	if err != nil {
		log.Fatalf("Failed to get executable path: %v", err)
	}
	exeDir := filepath.Dir(exePath)
	
	// Fallback para cuando se ejecuta con 'go run' (crea un binario en la carpeta Temp)
	if strings.Contains(exePath, "go-build") || strings.Contains(exePath, "Temp") || strings.Contains(exePath, "temp") {
		exeDir, _ = os.Getwd()
	}

	if err := services.InitProviderService(exeDir); err != nil {
		log.Fatalf("Failed to initialize provider service: %v", err)
	}

	services.UpdateExchangeRates()

	r := gin.Default()

	// Enable CORS if needed (for now just a simple middleware)
	r.Use(func(c *gin.Context) {
		c.Writer.Header().Set("Access-Control-Allow-Origin", "*")
		c.Writer.Header().Set("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS")
		c.Writer.Header().Set("Access-Control-Allow-Headers", "Content-Type, Authorization")
		if c.Request.Method == "OPTIONS" {
			c.AbortWithStatus(204)
			return
		}
		c.Next()
	})

	publicRoot, err := fs.Sub(publicFS, "public")
	if err != nil {
		log.Fatalf("Failed to initialize public filesystem: %v", err)
	}

	cssFS, _ := fs.Sub(publicRoot, "css")
	jsFS, _ := fs.Sub(publicRoot, "js")
	viewsFS, _ := fs.Sub(publicRoot, "views")

	r.StaticFS("/css", http.FS(cssFS))
	r.StaticFS("/js", http.FS(jsFS))
	r.StaticFS("/views", http.FS(viewsFS))
	indexHtml, err := fs.ReadFile(publicFS, "public/index.html")
	if err != nil {
		log.Fatalf("Failed to read index.html: %v", err)
	}

	r.GET("/", func(c *gin.Context) {
		c.Data(http.StatusOK, "text/html; charset=utf-8", indexHtml)
	})

	api := r.Group("/api")
	{
		api.POST("/extract-text", handlers.ExtractText)
		api.POST("/validate-strict", handlers.ValidateStrict)
		api.POST("/detect-heuristics", handlers.DetectHeuristics)
		api.POST("/identify-provider", handlers.IdentifyProvider)

		api.GET("/providers", handlers.GetProviders)
		api.POST("/providers", handlers.CreateProvider)
		api.DELETE("/providers/:id", handlers.DeleteProvider)
		api.PUT("/providers/:id", handlers.UpdateProvider)
		
		api.GET("/exchange-rate", handlers.GetExchangeRate)
		api.POST("/exchange-rate/refresh", handlers.RefreshExchangeRate)
	}

	log.Println("Server is running on http://localhost:3000")
	if err := r.Run(":3000"); err != nil {
		log.Fatalf("Failed to start server: %v", err)
	}
}
