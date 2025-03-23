package cleanup

import (
	"context"
	"encoding/json"
	"fmt"
	"github.com/pulumi-idp/internal/config"
	"github.com/pulumi-idp/internal/model"
	"io"
	"log"
	"net/http"
	"strings"
	"sync"
	"time"

	"github.com/go-co-op/gocron"
)

// StackCleanupService handles scheduled deletion of stacks
type StackCleanupService struct {
	HTTPClient       *http.Client
	scheduler        *gocron.Scheduler
	isRunning        bool
	mutex            sync.Mutex
	lastRunTime      time.Time
	deletionCriteria StackDeletionCriteria
	logger           *log.Logger
	cfg              *config.Config
}

type DeletionTags struct {
	Key   string
	Value string
}

// StackDeletionCriteria defines rules for which stacks should be deleted
type StackDeletionCriteria struct {
	DeletionTags DeletionTags
}

// NewStackCleanupService creates a new stack cleanup service
func NewStackCleanupService(cfg *config.Config, criteria StackDeletionCriteria, logger *log.Logger) *StackCleanupService {
	if logger == nil {
		logger = log.New(log.Writer(), "[StackCleanup] ", log.LstdFlags)
	}

	// Create a new scheduler that runs in its own goroutine
	scheduler := gocron.NewScheduler(time.UTC)

	return &StackCleanupService{
		HTTPClient: &http.Client{
			Timeout: 30 * time.Second,
		},
		cfg:              cfg,
		scheduler:        scheduler,
		isRunning:        false,
		deletionCriteria: criteria,
		logger:           logger,
	}
}

// Start begins the stack cleanup routine
func (s *StackCleanupService) Start() error {
	s.mutex.Lock()
	defer s.mutex.Unlock()

	if s.isRunning {
		return fmt.Errorf("stack cleanup service is already running")
	}

	// Schedule the cleanup to run every minute
	_, err := s.scheduler.Every(1).Minute().Do(s.runCleanup)
	if err != nil {
		return fmt.Errorf("failed to schedule stack cleanup: %w", err)
	}

	// Start the scheduler
	s.scheduler.StartAsync()
	s.isRunning = true
	s.logger.Println("Stack cleanup service started")

	return nil
}

// Stop stops the stack cleanup routine
func (s *StackCleanupService) Stop() {
	s.mutex.Lock()
	defer s.mutex.Unlock()

	if s.isRunning {
		s.scheduler.Stop()
		s.isRunning = false
		s.logger.Println("Stack cleanup service stopped")
	}
}

// TriggerCleanup manually triggers the cleanup process
func (s *StackCleanupService) TriggerCleanup() {
	s.logger.Println("Manual cleanup triggered")
	go s.runCleanup()
}

// runCleanup performs the actual stack cleanup process
func (s *StackCleanupService) runCleanup() {
	s.mutex.Lock()
	s.lastRunTime = time.Now()
	s.mutex.Unlock()

	s.logger.Println("Starting scheduled stack cleanup")

	// Create a context with timeout for the operation
	ctx, cancel := context.WithTimeout(context.Background(), 55*time.Second)
	defer cancel()

	// Get stacks that meet deletion criteria
	stacksToDelete, err := s.findStacksToDelete()
	if err != nil {
		s.logger.Printf("Error finding stacks to delete: %v", err)
		return
	}

	s.logger.Printf("Found %d stacks to delete", len(stacksToDelete.Stacks))

	// Delete each stack
	for _, stack := range stacksToDelete.Stacks {
		// Check if our context is still valid before proceeding
		if ctx.Err() != nil {
			s.logger.Println("Cleanup operation timed out, will continue in next run")
			return
		}

		fullStackName := fmt.Sprintf("%s/%s/%s", stack.OrgName, stack.ProjectName, stack.StackName)
		s.logger.Printf("Deleting stack: %s", fullStackName)

		if err := s.deleteStack(ctx, stack.OrgName, stack.ProjectName, stack.StackName); err != nil {
			s.logger.Printf("Failed to delete stack %s: %v", fullStackName, err)
			continue
		}
	}

	s.logger.Println("Scheduled stack cleanup completed")
}

// Stack represents the metadata of a stack
type Stack struct {
	OrgName     string
	ProjectName string
	StackName   string
	LastUpdate  time.Time
	Tags        map[string]string
}

// findStacksToDelete identifies stacks that should be deleted based on criteria
func (s *StackCleanupService) findStacksToDelete() (*model.ListStacksResponse, error) {
	url := fmt.Sprintf("%s/user/stacks", s.cfg.Pulumi.APIBaseURL)

	params := make([]string, 0)

	params = append(params, fmt.Sprintf("organization=%s", s.cfg.Pulumi.Organization))

	params = append(params, fmt.Sprintf("tagName=%s", s.deletionCriteria.DeletionTags.Key))

	params = append(params, fmt.Sprintf("tagValue=%s", s.deletionCriteria.DeletionTags.Value))

	if len(params) > 0 {
		url += "?" + strings.Join(params, "&")
	}

	req, err := http.NewRequest(http.MethodGet, url, nil)
	if err != nil {
		return nil, fmt.Errorf("error creating request: %w", err)
	}

	// Add the necessary headers
	req.Header.Set("Accept", s.cfg.Pulumi.APIVersion)
	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("Authorization", "token "+s.cfg.Pulumi.APIToken)

	// Execute the request
	resp, err := s.HTTPClient.Do(req)
	if err != nil {
		return nil, fmt.Errorf("error sending request: %w", err)
	}
	defer resp.Body.Close()

	// Check for successful response
	if resp.StatusCode != http.StatusOK {
		bodyBytes, _ := io.ReadAll(resp.Body)
		return nil, fmt.Errorf("failed to list stacks: HTTP %d, response: %s", resp.StatusCode, string(bodyBytes))
	}

	// Parse the response
	var listResp model.ListStacksResponse
	if err := json.NewDecoder(resp.Body).Decode(&listResp); err != nil {
		return nil, fmt.Errorf("error decoding response: %w", err)
	}

	return &listResp, nil
}

// deleteStack deletes a stack
func (s *StackCleanupService) deleteStack(ctx context.Context, organization, project, stack string) error {
	if organization == "" || project == "" || stack == "" {
		return fmt.Errorf("organization, project, and stack are required")
	}

	url := fmt.Sprintf("%s/stacks/%s/%s/%s", s.cfg.Pulumi.APIBaseURL, organization, project, stack)

	req, err := http.NewRequest(http.MethodDelete, url, nil)
	if err != nil {
		return fmt.Errorf("error creating request: %w", err)
	}

	// Add the necessary headers
	req.Header.Set("Accept", s.cfg.Pulumi.APIVersion)
	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("Authorization", "token "+s.cfg.Pulumi.APIToken)

	resp, err := s.HTTPClient.Do(req)
	if err != nil {
		return fmt.Errorf("error sending request: %w", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusNoContent {
		s.logger.Printf("Failed to delete stack %s: HTTP %d, response: %s", stack, resp.StatusCode, resp.Status)
	}
	return nil
}

// GetLastRunTime returns the time of the last cleanup run
func (s *StackCleanupService) GetLastRunTime() time.Time {
	s.mutex.Lock()
	defer s.mutex.Unlock()
	return s.lastRunTime
}

// UpdateCriteria updates the deletion criteria
func (s *StackCleanupService) UpdateCriteria(criteria StackDeletionCriteria) {
	s.mutex.Lock()
	defer s.mutex.Unlock()
	s.deletionCriteria = criteria
}

// IsRunning returns whether the service is currently running
func (s *StackCleanupService) IsRunning() bool {
	s.mutex.Lock()
	defer s.mutex.Unlock()
	return s.isRunning
}
