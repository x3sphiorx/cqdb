import React from 'react';
import {
  Button,
  Col,
} from 'react-bootstrap';

export function renderButton(handleButton, label) {
  return (
    <Col lg={4} md={4} sm={12} xs={12}>
      <Button style={{marginBottom: '5px',}} block onClick={handleButton}>
        {label}
      </Button>
    </Col>
  );
}