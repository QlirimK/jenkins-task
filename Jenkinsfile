pipeline {
  agent any
  options { timestamps(); disableConcurrentBuilds() }

  environment {
    REGISTRY_CREDENTIALS = 'dockerhub-creds'
    DOCKERHUB_USER = 'qlirimkastrati'
    DOCKER_REPO = 'node-app'
    K8S_NAMESPACE = 'devops-demo'
    IMAGE_NAME = "${env.DOCKERHUB_USER}/${env.DOCKER_REPO}"
    SHORT_SHA  = "${env.GIT_COMMIT ? env.GIT_COMMIT.take(7) : 'latest'}"
    IMAGE_TAG  = "${env.SHORT_SHA}"
    TEST_RESULTS_DIR = "test-results"
  }

  stages {
    stage('Checkout') {
      steps { checkout scm }
    }

    stage('Build Docker Image') {
      steps {
        powershell '''
          $ErrorActionPreference = "Stop"
          docker version
          docker build --file Dockerfile `
            --tag "$($env:IMAGE_NAME):$($env:IMAGE_TAG)" `
            --tag "$($env:IMAGE_NAME):latest" `
            .
        '''
      }
    }

    stage('Run Tests (in container)') {
  steps {
    powershell '''
      $ErrorActionPreference = "Stop"

      # Host-Ergebnisordner frisch anlegen
      $hostResults = Join-Path $PWD $env:TEST_RESULTS_DIR
      if (Test-Path $hostResults) { Remove-Item -Recurse -Force $hostResults }
      New-Item -ItemType Directory -Force -Path $hostResults | Out-Null

      # Absoluten Pfad ermitteln
      $hostResultsFull = (Resolve-Path $hostResults).Path

      # Tests im Container ausführen; Jest schreibt JUnit nach /test-results
      docker run --rm `
        -e CI=true `
        -v "$($hostResultsFull):/test-results" `
        "$($env:IMAGE_NAME):$($env:IMAGE_TAG)" `
        sh -c "npm ci && npm test"

      # Sicherstellen, dass junit.xml existiert
      if (!(Test-Path (Join-Path $hostResults 'junit.xml'))) {
        Write-Host 'DEBUG: Inhalt von test-results:'
        Get-ChildItem -Recurse $hostResults | Format-List -Property FullName,Length,LastWriteTime
        throw 'junit.xml wurde nicht erzeugt.'
      }
    '''
  }
  post {
    always {
      junit allowEmptyResults: false, testResults: "${TEST_RESULTS_DIR}/junit.xml"
      archiveArtifacts artifacts: "${TEST_RESULTS_DIR}/**", fingerprint: true, onlyIfSuccessful: false
    }
  }
}

    stage('Push to Docker Hub') {
  steps {
    withCredentials([usernamePassword(credentialsId: env.REGISTRY_CREDENTIALS, usernameVariable: 'DOCKERHUB_USER_C', passwordVariable: 'DOCKERHUB_PASS_C')]) {
      powershell '''
        $ErrorActionPreference="Stop"

        # sanity: zeige die Images, die wir gleich pushen
        docker image ls "$($env:IMAGE_NAME)"

        # Login
        $pass = $env:DOCKERHUB_PASS_C
        docker logout | Out-Null
        $pass | docker login -u "$env:DOCKERHUB_USER_C" --password-stdin

        # Push beide Tags
        docker push "$($env:IMAGE_NAME):$($env:IMAGE_TAG)"
        docker push "$($env:IMAGE_NAME):latest"

        docker logout
      '''
    }
  }
}


    stage('Deploy to Kubernetes') {
  steps {
    withCredentials([file(credentialsId: 'kubeconfig-docker-desktop', variable: 'KUBECONFIG_FILE')]) {
      powershell '''
        $ErrorActionPreference="Stop"
        # Kubeconfig für diesen Prozess setzen
        $env:KUBECONFIG = "$env:KUBECONFIG_FILE"

        kubectl version --short

        kubectl get ns $env:K8S_NAMESPACE 2>$null | Out-Null
        if ($LASTEXITCODE -ne 0) { kubectl create ns $env:K8S_NAMESPACE }

        kubectl -n $env:K8S_NAMESPACE apply -f k8s/
        kubectl -n $env:K8S_NAMESPACE set image deploy/node-app node-app="$($env:IMAGE_NAME):$($env:IMAGE_TAG)" --record=true
        kubectl -n $env:K8S_NAMESPACE rollout status deploy/node-app
      '''
    }
  }
}


  post {
    success { echo "✅ Deployed ${env.IMAGE_NAME}:${env.IMAGE_TAG}" }
    failure { echo "❌ Pipeline failed" }
  }
}
