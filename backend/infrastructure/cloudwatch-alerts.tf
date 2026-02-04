resource "aws_cloudwatch_metric_alarm" "high_error_rate" {
  alarm_name          = "hrms-high-error-rate"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = "2"
  metric_name         = "Errors"
  namespace           = "HRMS"
  period              = "60"
  statistic           = "Sum"
  threshold           = "10"
  alarm_description   = "This metric monitors high error rate in HRMS"
  alarm_actions       = [aws_sns_topic.alerts.arn]

  dimensions = {
    Service = "hrms-backend"
  }
}

resource "aws_cloudwatch_metric_alarm" "high_latency" {
  alarm_name          = "hrms-high-latency"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = "2"
  metric_name         = "APIResponseTime"
  namespace           = "HRMS"
  period              = "60"
  statistic           = "Average"
  threshold           = "2"
  alarm_description   = "This metric monitors high latency in HRMS"
  alarm_actions       = [aws_sns_topic.alerts.arn]

  dimensions = {
    Service = "hrms-backend"
  }
}
