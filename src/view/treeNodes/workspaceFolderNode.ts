/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import * as path from 'path';
import * as vscode from 'vscode';
import { QUERIES } from '../../common/settingKeys';
import { ITelemetry } from '../../common/telemetry';
import { FolderRepositoryManager, SETTINGS_NAMESPACE } from '../../github/folderRepositoryManager';
import { PRType } from '../../github/interface';
import { NotificationProvider } from '../../github/notifications';
import { PrsTreeModel } from '../prsTreeModel';
import { CategoryTreeNode } from './categoryNode';
import { EXPANDED_QUERIES_STATE, TreeNode, TreeNodeParent } from './treeNode';

export interface IQueryInfo {
	label: string;
	query: string;
}

export class WorkspaceFolderNode extends TreeNode implements vscode.TreeItem {
	public collapsibleState: vscode.TreeItemCollapsibleState;
	public iconPath?: { light: string | vscode.Uri; dark: string | vscode.Uri };

	constructor(
		parent: TreeNodeParent,
		uri: vscode.Uri,
		private folderManager: FolderRepositoryManager,
		private telemetry: ITelemetry,
		private notificationProvider: NotificationProvider,
		private context: vscode.ExtensionContext,
		private readonly _prsTreeModel: PrsTreeModel
	) {
		super();
		this.parent = parent;
		this.collapsibleState = vscode.TreeItemCollapsibleState.Expanded;
		this.label = path.basename(uri.fsPath);
		this.id = folderManager.repository.rootUri.toString();
	}

	private static getQueries(folderManager: FolderRepositoryManager): IQueryInfo[] {
		return (
			vscode.workspace
				.getConfiguration(SETTINGS_NAMESPACE, folderManager.repository.rootUri)
				.get<IQueryInfo[]>(QUERIES) || []
		);
	}

	getTreeItem(): vscode.TreeItem {
		return this;
	}

	async getChildren(): Promise<TreeNode[]> {
		super.getChildren();
		this.children = WorkspaceFolderNode.getCategoryTreeNodes(this.folderManager, this.telemetry, this, this.notificationProvider, this.context, this._prsTreeModel);
		return this.children;
	}

	public static getCategoryTreeNodes(
		folderManager: FolderRepositoryManager,
		telemetry: ITelemetry,
		parent: TreeNodeParent,
		notificationProvider: NotificationProvider,
		context: vscode.ExtensionContext,
		prsTreeModel: PrsTreeModel
	) {
		const expandedQueries = new Set<string>(context.workspaceState.get(EXPANDED_QUERIES_STATE, [] as string[]));

		const queryCategories = WorkspaceFolderNode.getQueries(folderManager).map(
			queryInfo =>
				new CategoryTreeNode(parent, folderManager, telemetry, PRType.Query, notificationProvider, expandedQueries, prsTreeModel, queryInfo.label, queryInfo.query),
		);
		return [
			new CategoryTreeNode(parent, folderManager, telemetry, PRType.LocalPullRequest, notificationProvider, expandedQueries, prsTreeModel),
			...queryCategories,
			new CategoryTreeNode(parent, folderManager, telemetry, PRType.All, notificationProvider, expandedQueries, prsTreeModel),
		];
	}
}
